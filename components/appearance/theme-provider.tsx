"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { accentVariables, type AccentTheme } from "@/lib/appearance/themes";

type AppearanceContext = {
  theme: AccentTheme; savedTheme: AccentTheme;
  previewTheme: (theme: AccentTheme) => void; cancelPreview: () => void;
};
const Context = createContext<AppearanceContext | null>(null);

export function ThemeProvider({ savedTheme, children }: Readonly<{ savedTheme: AccentTheme; children: ReactNode }>) {
  const pathname = usePathname();
  const [preview, setPreview] = useState<AccentTheme | null>(null);
  // A preview belongs only to Profile. Navigation always uses the saved account preference.
  const theme = pathname === "/app/profile" ? preview ?? savedTheme : savedTheme;
  const previewTheme = useCallback((value: AccentTheme) => setPreview(value), []);
  const cancelPreview = useCallback(() => setPreview(null), []);
  return <Context.Provider value={{ theme, savedTheme, previewTheme, cancelPreview }}>
    <div className="app-theme min-h-dvh" data-accent-theme={theme} style={accentVariables(theme)}>{children}</div>
  </Context.Provider>;
}
export function useAppearance() {
  const context = useContext(Context);
  if (!context) throw new Error("Appearance must be used within ThemeProvider");
  return context;
}
