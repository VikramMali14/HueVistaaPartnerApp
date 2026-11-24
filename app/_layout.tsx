// Import each weight by its own path: the package root pulls in all 18 Inter files.
import { InstrumentSerif_400Regular_Italic } from "@expo-google-fonts/instrument-serif/400Regular_Italic";
import { Inter_400Regular } from "@expo-google-fonts/inter/400Regular";
import { Inter_500Medium } from "@expo-google-fonts/inter/500Medium";
import { Inter_600SemiBold } from "@expo-google-fonts/inter/600SemiBold";
import { Inter_700Bold } from "@expo-google-fonts/inter/700Bold";
import { QueryClientProvider } from "@tanstack/react-query";
import { useFonts } from "expo-font";
import { Stack, type ErrorBoundaryProps } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import * as SystemUI from "expo-system-ui";
import { useEffect, useState } from "react";
import { StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { connectQueryClientToApp, queryClient } from "@/api/query-client";
import { SessionProvider, useSession } from "@/auth/session";
import { ErrorState, Screen, ToastProvider } from "@/components/ui";
import { t } from "@/i18n";
import { loadLanguage } from "@/i18n/language";
import { useTheme } from "@/theme";

// Keep the native splash up until the fonts are in and the session is known.
void SplashScreen.preventAutoHideAsync();

/** A screen that throws while drawing: the way back, never a white page. */
export function ErrorBoundary({ retry }: ErrorBoundaryProps) {
  return (
    <Screen>
      <ErrorState message={t("errors.screenBroke")} onRetry={() => void retry()} />
    </Screen>
  );
}

/** Never hold the splash longer than this; app/index.tsx then says "Still connecting…". */
const SPLASH_MAX_MS = 8_000;

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    InstrumentSerif_400Regular_Italic,
  });

  // The language is read from the phone before anything is drawn, so no screen shows in the wrong one.
  const [languageReady, setLanguageReady] = useState(false);
  useEffect(() => {
    void loadLanguage().finally(() => setLanguageReady(true));
  }, []);

  useEffect(() => connectQueryClientToApp(), []);

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <SessionProvider>
            <ToastProvider>
              <Root ready={(fontsLoaded || Boolean(fontError)) && languageReady} />
            </ToastProvider>
          </SessionProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function Root({ ready }: { ready: boolean }) {
  const { state } = useSession();
  const { colors, scheme } = useTheme();
  const [waitedTooLong, setWaitedTooLong] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setWaitedTooLong(true), SPLASH_MAX_MS);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(colors.bg);
  }, [colors.bg]);

  const canShow = ready && (state.status !== "loading" || waitedTooLong);
  useEffect(() => {
    if (canShow) void SplashScreen.hideAsync();
  }, [canShow]);

  if (!ready) return null;

  return (
    <>
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      {/* A new language redraws every screen in place: each one draws with the theme, which
          follows the language (theme/index.ts useTheme). */}
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg }, animation: "slide_from_right" }} />
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
