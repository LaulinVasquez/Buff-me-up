"use client";
import { useEffect, useState } from "react";

export function RestTimer() {
  const [duration, setDuration] = useState(90);
  const [deadline, setDeadline] = useState<number | null>(null);
  const [remaining, setRemaining] = useState(0);
  useEffect(() => {
    if (deadline === null) return;
    const tick = () => {
      const seconds = Math.max(0, Math.ceil((deadline-Date.now())/1000));
      setRemaining(seconds);
      if (!seconds) setDeadline(null);
    };
    tick(); const interval = setInterval(tick, 250);
    document.addEventListener("visibilitychange", tick);
    return () => { clearInterval(interval); document.removeEventListener("visibilitychange", tick); };
  }, [deadline]);
  return <section aria-label="Rest timer" className="mt-5 rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-bold">Rest timer</h2><span className="font-mono text-xl tabular-nums" aria-label={`${remaining} seconds remaining`}>{Math.floor(remaining/60)}:{String(remaining%60).padStart(2,"0")}</span></div>
    <div className="mt-3 flex flex-wrap items-center gap-2"><label className="sr-only" htmlFor="rest-duration">Rest duration</label><select id="rest-duration" value={duration} disabled={deadline !== null} onChange={event => setDuration(Number(event.target.value))} className="min-h-11 rounded-xl bg-slate-800 px-3">{[30,60,90,120,180].map(seconds => <option key={seconds} value={seconds}>{seconds} sec</option>)}</select><button type="button" onClick={() => { setRemaining(duration); setDeadline(Date.now()+duration*1000); }} className="min-h-11 rounded-xl bg-accent-400 px-4 font-bold text-slate-950">{deadline ? "Restart" : "Start rest"}</button>{deadline ? <button type="button" onClick={() => { setDeadline(null); setRemaining(0); }} className="min-h-11 px-3 text-sm text-slate-400">Stop</button> : null}</div>
    <p role="status" className="mt-2 text-xs text-slate-400">{!deadline && remaining === 0 ? "Ready when you are. Timer runs while this workout is open." : "Resting. The timer catches up when you return to this tab."}</p>
  </section>;
}
