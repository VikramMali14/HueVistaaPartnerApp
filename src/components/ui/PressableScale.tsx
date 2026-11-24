import type { ReactNode } from "react";
import { Pressable, type AccessibilityRole, type AccessibilityState, type StyleProp, type ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";

import { useReducedMotion } from "./use-reduced-motion";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** The spring a press settles with: quick, with no wobble to wait for. */
const PRESS_SPRING = { damping: 18, stiffness: 420, mass: 0.6 } as const;

export interface PressableScaleProps {
  children: ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  disabled?: boolean;
  /** How far the surface sinks under a finger: 0.97 for a card, 0.94 for a small tile. */
  pressedScale?: number;
  style?: StyleProp<ViewStyle>;
  accessibilityRole?: AccessibilityRole;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityState?: AccessibilityState;
  testID?: string;
}

/**
 * A surface that gives under a finger: it sinks a little while pressed and springs back — the
 * physical answer a tap gets on a good phone app. With "Reduce motion" on it stays still, and
 * the press still works.
 */
export function PressableScale({
  children,
  onPress,
  onLongPress,
  disabled,
  pressedScale = 0.97,
  style,
  accessibilityRole = "button",
  accessibilityLabel,
  accessibilityHint,
  accessibilityState,
  testID,
}: PressableScaleProps) {
  const reduced = useReducedMotion();
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));

  return (
    <AnimatedPressable
      testID={testID}
      onPress={onPress}
      onLongPress={onLongPress}
      disabled={disabled}
      onPressIn={() => {
        if (!reduced) scale.set(withSpring(pressedScale, PRESS_SPRING));
      }}
      onPressOut={() => {
        scale.set(withSpring(1, PRESS_SPRING));
      }}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: Boolean(disabled), ...accessibilityState }}
      style={[style, animated]}
    >
      {children}
    </AnimatedPressable>
  );
}
