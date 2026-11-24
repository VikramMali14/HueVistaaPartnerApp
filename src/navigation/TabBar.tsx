import Feather from "@expo/vector-icons/Feather";
import type { BottomTabBarProps } from "expo-router/js-tabs";
import { useEffect, type ComponentProps } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

import { Text, useReducedMotion } from "@/components/ui";
import { getLanguage } from "@/i18n";
import { buzz } from "@/lib/haptics";
import { fonts, hairline, useTheme } from "@/theme";

export type TabIcon = ComponentProps<typeof Feather>["name"];

/** The bar's own height, above the phone's bottom inset: an icon in its pill, and a label. */
export const TAB_BAR_HEIGHT = 66;

/**
 * The bottom bar, drawn by the app rather than the navigator: Material 3's navigation bar, in the
 * HueVistaa palette. The tab you're on has its icon in a brass-tinted pill that widens into place;
 * the others are quiet. A small brass badge says something is waiting there (an answer from the
 * owner). Changing tab ticks the phone's haptics, as a choice among a few should.
 */
export function TabBar({
  state,
  descriptors,
  navigation,
  insets,
  icons,
  primary,
}: BottomTabBarProps & { icons: Record<string, TabIcon>; primary?: string }) {
  const { colors } = useTheme();
  return (
    <View
      accessibilityRole="tablist"
      style={[styles.bar, { paddingBottom: insets.bottom, height: TAB_BAR_HEIGHT + insets.bottom, backgroundColor: colors.bg, borderTopColor: colors.rule }]}
    >
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key]!;
        const focused = state.index === index;
        const label = options.title ?? route.name;
        const badge = options.tabBarBadge;
        const onPress = () => {
          const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) {
            buzz.select();
            navigation.navigate(route.name, route.params);
          }
        };
        return (
          <TabItem
            key={route.key}
            label={label}
            icon={icons[route.name] ?? "circle"}
            focused={focused}
            primary={route.name === primary}
            badge={badge}
            onPress={onPress}
            onLongPress={() => navigation.emit({ type: "tabLongPress", target: route.key })}
            testID={options.tabBarButtonTestID ?? `tab-${route.name}`}
          />
        );
      })}
    </View>
  );
}

function TabItem({
  label,
  icon,
  focused,
  primary = false,
  badge,
  onPress,
  onLongPress,
  testID,
}: {
  label: string;
  icon: TabIcon;
  focused: boolean;
  /** The one thing the side is opened for (a painter's Scan): always a brass capsule. */
  primary?: boolean;
  badge?: number | string;
  onPress: () => void;
  onLongPress: () => void;
  testID: string;
}) {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const on = useSharedValue(focused ? 1 : 0);
  useEffect(() => {
    on.set(reduced ? (focused ? 1 : 0) : withTiming(focused ? 1 : 0, { duration: 200 }));
  }, [focused, on, reduced]);
  const pill = useAnimatedStyle(() => ({ opacity: on.get(), transform: [{ scaleX: 0.55 + 0.45 * on.get() }] }));
  const hasBadge = badge !== undefined && badge !== 0 && badge !== "";
  const hindi = getLanguage() === "hi";

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={hasBadge ? `${label}, ${badge}` : label}
      testID={testID}
      style={styles.item}
    >
      <View style={styles.iconWrap}>
        {primary ? (
          <View style={[styles.pill, { backgroundColor: colors.accent }]} />
        ) : (
          <Animated.View style={[styles.pill, { backgroundColor: `${colors.accent}33` }, pill]} />
        )}
        <Feather name={icon} size={22} color={primary ? colors.accentOn : focused ? colors.accentText : colors.fgMute} />
        {hasBadge ? (
          <View style={[styles.badge, { backgroundColor: colors.accent, borderColor: colors.bg }]} testID={`${testID}-badge`}>
            {typeof badge === "number" && badge > 0 ? (
              <Text style={{ fontFamily: fonts.bold, fontSize: 10, lineHeight: 13, color: colors.accentOn }} maxFontSizeMultiplier={1}>
                {badge > 9 ? "9+" : String(badge)}
              </Text>
            ) : null}
          </View>
        ) : null}
      </View>
      <Text
        numberOfLines={1}
        maxFontSizeMultiplier={1.3}
        style={{
          fontFamily: focused ? fonts.bold : fonts.semibold,
          fontSize: 11.5,
          lineHeight: hindi ? 18 : 15,
          color: focused ? colors.fg : colors.fgMute,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: "row", borderTopWidth: hairline, paddingTop: 8 },
  item: { flex: 1, alignItems: "center", gap: 4 },
  iconWrap: { width: 60, height: 32, alignItems: "center", justifyContent: "center" },
  pill: { position: "absolute", width: 60, height: 32, borderRadius: 16 },
  badge: {
    position: "absolute",
    top: 0,
    right: 12,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 3,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
});
