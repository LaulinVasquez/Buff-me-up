import { Capacitor } from "@capacitor/core";

export const NATIVE_AUTH_REDIRECT_URI =
  "com.laurinvasquez.buffmeup://auth/callback";

export function isNativeApp() {
  return Capacitor.isNativePlatform();
}

export function isNativeAuthCallback(url: URL) {
  return url.protocol === "com.laurinvasquez.buffmeup:"
    && url.hostname === "auth"
    && url.pathname === "/callback";
}
