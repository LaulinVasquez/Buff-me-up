import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = { title: "Buff Me Up", description: "A simple, mobile-first gym tracking app." };
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#070b12" };

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
