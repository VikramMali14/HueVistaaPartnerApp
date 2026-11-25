import { Redirect } from "expo-router";

/** A link to a page the app doesn't have: back to the start, which routes by session. */
export default function NotFound() {
  return <Redirect href="/" />;
}
