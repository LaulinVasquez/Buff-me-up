"use client";
import { useEffect } from "react";
export function UnsavedWorkoutGuard() {
  useEffect(() => {
    const dirty = () => !!document.querySelector('[data-unsaved-sets="true"], [data-unsaved-notes="true"]');
    const unload = (event: BeforeUnloadEvent) => { if (dirty()) { event.preventDefault(); event.returnValue = ""; } };
    const leave = (event: Event) => {
      const target = event.target instanceof Element ? event.target : null;
      const leaving = event.type === "submit" ? target?.closest('[data-leaves-workout="true"]') : target?.closest('a[href]');
      if (leaving && dirty() && !window.confirm("You have unsaved workout edits. Leave or change this workout and discard those edits?")) { event.preventDefault(); event.stopPropagation(); }
    };
    window.addEventListener("beforeunload", unload);
    document.addEventListener("click", leave, true); document.addEventListener("submit", leave, true);
    return () => { window.removeEventListener("beforeunload", unload); document.removeEventListener("click", leave, true); document.removeEventListener("submit", leave, true); };
  }, []);
  return null;
}
