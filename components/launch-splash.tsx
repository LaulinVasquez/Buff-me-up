"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

const sessionKey = "buff-me-up-launch-splash";

export function LaunchSplash() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem(sessionKey)) return;
    sessionStorage.setItem(sessionKey, "shown");
    const showTimer = window.setTimeout(() => setVisible(true), 0);
    const hideTimer = window.setTimeout(() => setVisible(false), 1900);
    return () => { window.clearTimeout(showTimer); window.clearTimeout(hideTimer); };
  }, []);

  if (!visible) return null;
  return <div aria-label="Buff Me Up is loading" className="fixed inset-0 z-50 flex min-h-dvh items-center justify-center bg-slate-950">
    <div className="buff-launch-logo flex flex-col items-center gap-5">
      <Image alt="Buff Me Up" height={128} priority src="/icon.svg" width={128} />
      <span className="text-xs font-bold uppercase tracking-[0.3em] text-lime-400">Buff Me Up</span>
    </div>
  </div>;
}
