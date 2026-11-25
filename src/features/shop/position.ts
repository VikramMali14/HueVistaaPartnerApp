import * as Location from "expo-location";

/** Where the phone is, as the shop's places are saved from it. Never kept on the phone. */
export interface Position {
  latitude: number;
  longitude: number;
  accuracyMetres: number;
}

/**
 * What the phone said when asked where it is — here, for an owner saving the shop's place.
 *
 * - `here`: a position, from the phone's own location.
 * - `mocked`: Android says the position came from another app — a "fake GPS" app — rather than the
 *   phone's own location. It is never saved as the shop's place: staff would be checked against a
 *   made-up point.
 * - `denied`: the person said no to location for HueVistaa.
 * - `off`: location is switched off on the phone.
 * - `unknown`: it was asked and could not say in time (indoors, no signal).
 *
 * Only `here` carries a position.
 */
export type Where =
  | { kind: "here"; position: Position }
  | { kind: "mocked" }
  | { kind: "denied" }
  | { kind: "off" }
  | { kind: "unknown" };

/** How long a fix may take before the phone is taken not to know. A counter can't wait longer. */
const FIX_TIMEOUT_MS = 15_000;

function within<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      () => {
        clearTimeout(timer);
        resolve(null);
      },
    );
  });
}

/**
 * Asks the phone where it is, asking for permission first if it has not been given. Called only
 * when the owner presses "Save where I am now" — opening a screen never asks.
 */
export async function whereAmI(): Promise<Where> {
  try {
    const current = await Location.getForegroundPermissionsAsync();
    const permission = current.granted ? current : await Location.requestForegroundPermissionsAsync();
    if (!permission.granted) return { kind: "denied" };
    if (!(await Location.hasServicesEnabledAsync())) return { kind: "off" };
    const fix = await within(Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }), FIX_TIMEOUT_MS);
    if (!fix) return { kind: "unknown" };
    if (fix.mocked) return { kind: "mocked" };
    return {
      kind: "here",
      position: {
        latitude: fix.coords.latitude,
        longitude: fix.coords.longitude,
        accuracyMetres: fix.coords.accuracy ?? 0,
      },
    };
  } catch {
    return { kind: "unknown" };
  }
}
