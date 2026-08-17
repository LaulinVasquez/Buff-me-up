import { Capacitor } from "@capacitor/core";

export const NATIVE_AUTH_REDIRECT_URI =
  "com.samirrodriguez.buffmeup://auth/callback";

export function isNativeApp() {
  return Capacitor.isNativePlatform();
}

const NATIVE_AUTH_PROTOCOLS = new Set([
  "com.samirrodriguez.buffmeup:",
  "com.laurinvasquez.buffmeup:",
]);

export function isNativeAuthCallback(url: URL) {
  return NATIVE_AUTH_PROTOCOLS.has(url.protocol)
    && url.hostname === "auth"
    && url.pathname === "/callback";
}
