import { Text as RNText, View } from "react-native";

import { t } from "@/i18n";
import { fonts, useTheme } from "@/theme";

import { BrandMark } from "./BrandMark";

/** The brand, as the website sets it (HueVistaFrontEnd/src/lib/brand.ts). Not translated: it is the logo. */
const NAME = "HueVistaa";

/**
 * The staff app's logo: the mark, the name, and a brass "Staff" tag beside it — the same
 * HueVistaa, made for the people behind the counter. It does not grow with the phone's
 * text-size setting: it is a picture of the name. Screen readers get it as one image.
 */
export function BrandLockup({ size = "md" }: { size?: "sm" | "md" }) {
  const { colors, radius } = useTheme();
  const word = size === "md" ? 26 : 20;
  const mark = size === "md" ? 36 : 28;
  const tag = t("auth.welcome.tag");
  return (
    <View
      style={{ flexDirection: "row", alignItems: "center", gap: size === "md" ? 12 : 10, alignSelf: "flex-start" }}
      accessible
      accessibilityRole="image"
      accessibilityLabel={`${NAME} ${tag}`}
    >
      <BrandMark size={mark} />
      <RNText
        allowFontScaling={false}
        style={{ fontFamily: fonts.bold, fontSize: word, lineHeight: word + 6, letterSpacing: -0.03 * word, color: colors.fg }}
      >
        {NAME}
      </RNText>
      <View
        style={{
          paddingHorizontal: 9,
          paddingVertical: 3,
          borderRadius: radius.pill,
          backgroundColor: colors.accent,
        }}
      >
        <RNText
          allowFontScaling={false}
          style={{
            fontFamily: fonts.bold,
            fontSize: size === "md" ? 12 : 11,
            lineHeight: size === "md" ? 18 : 16,
            letterSpacing: 0.6,
            textTransform: "uppercase",
            color: colors.accentOn,
          }}
        >
          {tag}
        </RNText>
      </View>
    </View>
  );
}
