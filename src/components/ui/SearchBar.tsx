import Feather from "@expo/vector-icons/Feather";
import { useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";

import { fonts, hairline, minTouch, useTheme } from "@/theme";

/**
 * The search a counter types into with a customer waiting: a wide capsule, the glass at the
 * start, a clear button the moment there is something to clear. Brass outline while typing.
 * The label is said to screen readers; the placeholder shows what to type.
 */
export function SearchBar({
  value,
  onChangeText,
  label,
  placeholder,
  clearLabel,
  testID,
}: {
  value: string;
  onChangeText: (text: string) => void;
  label: string;
  placeholder?: string;
  clearLabel: string;
  testID?: string;
}) {
  const { colors, radius, type } = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <View
      style={[
        styles.wrap,
        {
          borderRadius: radius.pill,
          backgroundColor: colors.surface,
          borderColor: focused ? colors.accent : colors.ruleStrong,
        },
      ]}
    >
      <Feather name="search" size={20} color={focused ? colors.accentText : colors.fgMute} />
      <TextInput
        testID={testID}
        value={value}
        onChangeText={onChangeText}
        accessibilityLabel={label}
        placeholder={placeholder}
        placeholderTextColor={colors.fgMuteDeep}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType="search"
        selectionColor={colors.accent}
        style={[styles.input, { color: colors.fg, fontFamily: fonts.regular, fontSize: 17, lineHeight: type.body.lineHeight }]}
      />
      {value ? (
        <Pressable
          onPress={() => onChangeText("")}
          accessibilityRole="button"
          accessibilityLabel={clearLabel}
          hitSlop={10}
          testID={testID ? `${testID}-clear` : undefined}
          style={({ pressed }) => [styles.clear, { backgroundColor: pressed ? colors.ruleStrong : colors.surfaceSoft }]}
        >
          <Feather name="x" size={16} color={colors.fgSoft} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { minHeight: minTouch + 6, flexDirection: "row", alignItems: "center", gap: 10, paddingLeft: 18, paddingRight: 8, borderWidth: hairline },
  input: { flex: 1, paddingVertical: 10 },
  clear: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
});
