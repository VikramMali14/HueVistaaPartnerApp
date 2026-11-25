import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

/**
 * The phone's buzz, for the moments a hand should feel: the mark going in, a tab changing, a
 * refusal. Never for decoration. A phone without a motor (or the web preview) simply says
 * nothing — a buzz is never worth an error.
 */
const quiet = (run: () => Promise<void>) => {
  if (Platform.OS === "web") return;
  run().catch(() => {});
};

export const buzz = {
  /** A press that starts something — the big button going down. */
  press: () => quiet(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  /** A choice among a few — a tab, a shop, a day. */
  select: () => quiet(() => Haptics.selectionAsync()),
  /** It went in: marked present, sent to the owner. */
  success: () => quiet(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  /** It needs the person: away from the shop, a refusal. */
  warning: () => quiet(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
};
