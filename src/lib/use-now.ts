import { useEffect, useState } from "react";

/**
 * The time now, ticking every `everyMs` while `on` — for a "3 h 12 min at the shop" that keeps
 * itself true. Off, it stops ticking (nothing to count).
 */
export function useNow(everyMs = 30_000, on = true): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!on) return;
    // Caught up at once (from a callback, not the effect itself), then every `everyMs`.
    const first = setTimeout(() => setNow(Date.now()), 0);
    const timer = setInterval(() => setNow(Date.now()), everyMs);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [everyMs, on]);
  return now;
}
