import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { NativeAuthListener } from "@/components/auth/native-auth-listener";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Buff Me Up — Workout Tracker", template: "%s | Buff Me Up" },
  description: "A simple workout tracker built for the gym.",
  applicationName: "Buff Me Up",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon.svg" },
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Buff Me Up" },
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#070b12" };

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <html lang="en"><body><NativeAuthListener />{children}</body></html>;
}
