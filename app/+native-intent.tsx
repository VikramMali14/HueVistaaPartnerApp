import { holdSharedBoard, isFileUrl } from "@/features/painter/shared-board";

/**
 * Links from outside, before the router sees them. A PDF another app opened us with (a colour
 * board sent on WhatsApp — the app is registered for PDFs) arrives as a file rather than a link: it
 * goes to the painter's "board came as a PDF" screen (P7), to be read for the board's QR.
 * Everything else goes on as it came. Never throws: an error here would stop the app opening.
 */
export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  try {
    if (isFileUrl(path)) return holdSharedBoard(path);
    return path;
  } catch {
    return path;
  }
}
