"use client";

import Link from "next/link";
import { useId, useMemo, useState, useSyncExternalStore } from "react";
import { calculateCurrentStreak, localDateKey } from "@/lib/dates/local";
import {
  buildHistoryProgress, formatTrainingTime, historyHref, historyRange, isValidHistoryDate,
  periodLabel, sessionMinutes, shiftHistoryDate,
  type HistoryPeriod, type HistorySession, type ProgressBucket,
} from "@/lib/history/progress";

type Props = Readonly<{
  date: string;
  period: HistoryPeriod;
  timeZone: string;
  sessions: HistorySession[];
  totalWorkouts: number;
  attendanceTimestamps: string[];
  currentWorkout: { id: string; name: string; started_at: string } | null;
}>;
type Metric = "workouts" | "minutes";
const focus = "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-lime-400";
const card = "rounded-[1.75rem] border border-slate-800/80 bg-slate-900/65";

export function HistoryView(props: Props) {
  const progress = useMemo(() => buildHistoryProgress(props.sessions, props.period, props.date, props.timeZone), [props.sessions, props.period, props.date, props.timeZone]);
  const today = useSyncExternalStore(emptySubscribe, () => localDateKey(new Date(), props.timeZone), () => "");
  const streak = useMemo(() => today ? calculateCurrentStreak(props.attendanceTimestamps, props.timeZone) : null, [props.attendanceTimestamps, props.timeZone, today]);
  const [metric, setMetric] = useState<Metric>("workouts");
  const [selectedIndex, setSelectedIndex] = useState(() => progress.buckets.reduce((latest, bucket, index) => bucket.workouts ? index : latest, 0));
  const [visibleCount, setVisibleCount] = useState(6);
  const selected = progress.buckets[selectedIndex];
  const periodText = props.period === "day" ? "today" : `this ${props.period}`;
  const { start, end } = historyRange(props.period, props.date);
  const isCurrentPeriod = today >= start && today < end;
  const chartId = useId();

  return <main className="pb-28 pt-8">
    <header>
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-lime-400">Your training journal</p>
        <div className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-orange-300/15 bg-orange-300/5 px-3 py-1.5 text-xs font-semibold text-orange-200"><Icon name="flame" className="size-3.5" /><span>{streak ?? "—"} day streak</span></div>
      </div>
      <h1 className="mt-4 text-[2.35rem] font-black leading-[1.1] tracking-tight">Every session<br /><span className="text-slate-400">adds up.</span></h1>
      <p className="mt-3 text-sm leading-6 text-slate-400">Look back at the work. Keep moving forward.</p>
    </header>

    {props.currentWorkout ? <Link className={`mt-6 flex items-center gap-3 rounded-2xl border border-lime-400/25 bg-lime-400/5 p-4 ${focus}`} href={`/app/workout/${props.currentWorkout.id}`}>
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-lime-400/10 text-lime-400"><Icon name="play" /></span>
      <span className="min-w-0 flex-1"><span className="block text-[10px] font-bold uppercase tracking-wider text-lime-400">Ready when you are</span><strong className="mt-1 block truncate text-sm">{props.currentWorkout.name}</strong></span>
      <span className="text-xs font-bold text-lime-400">Resume <span aria-hidden="true">↗</span></span>
    </Link> : null}

    <section aria-label="Workout progress" className={`${card} relative mt-7 overflow-hidden p-4 sm:p-5`}>
      <div aria-hidden="true" className="pointer-events-none absolute -right-12 -top-24 size-64 rounded-full bg-lime-400/[0.04] blur-3xl" />
      <nav aria-label="Progress time range" className="relative grid grid-cols-3 gap-1 rounded-2xl bg-slate-950/80 p-1">
        {(["day", "month", "year"] as const).map((period) => <Link aria-current={props.period === period ? "page" : undefined} className={`flex min-h-11 items-center justify-center rounded-xl text-sm font-bold capitalize transition-colors ${focus} ${props.period === period ? "bg-lime-400 text-slate-950 shadow-[0_3px_16px_-6px_#a3e635]" : "text-slate-400 hover:bg-slate-800/70 hover:text-white"}`} href={historyHref(period, props.date, props.timeZone)} key={period} scroll={false}>{period}</Link>)}
      </nav>
      <div className="relative mt-5 flex items-center justify-between gap-2">
        <PeriodArrow amount={-1} {...props} />
        <div className="text-center"><h2 className="text-base font-bold tracking-tight">{periodLabel(props.period, props.date)}</h2><p className="mt-0.5 text-[10px] uppercase tracking-[0.18em] text-slate-500">{props.period === "day" ? "Hour by hour" : props.period === "month" ? "One day at a time" : "Your year in motion"}</p></div>
        <PeriodArrow amount={1} {...props} />
      </div>
      <div className="relative mt-6 flex flex-wrap items-end justify-between gap-3">
        <div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">{metric === "workouts" ? "Completed workouts" : "Time logged"}</p><div className="mt-1 flex items-baseline gap-2"><p className="text-[2.75rem] font-black leading-none tracking-tight text-white">{metric === "workouts" ? progress.workouts : formatTrainingTime(progress.minutes)}</p><span className="text-xs text-slate-500">{isCurrentPeriod ? periodText : props.period === "day" ? "on this day" : `in this ${props.period}`}</span></div></div>
        <div aria-label="Chart metric" className="flex rounded-xl border border-slate-800 bg-slate-950/70 p-1">{(["workouts", "minutes"] as const).map((item) => <button aria-controls={chartId} aria-pressed={metric === item} className={`min-h-9 rounded-lg px-2.5 text-[11px] font-bold transition-colors ${focus} ${metric === item ? "bg-slate-800 text-lime-300" : "text-slate-500 hover:text-slate-200"}`} key={item} onClick={() => setMetric(item)} type="button">{item === "workouts" ? "Workouts" : "Minutes"}</button>)}</div>
      </div>
      <ActivityChart buckets={progress.buckets} id={chartId} metric={metric} onSelect={setSelectedIndex} period={props.period} selectedIndex={selectedIndex} />
      <p className="-mt-1 mb-4 text-[10px] leading-5 text-slate-500">By completion time · {props.timeZone.replaceAll("_", " ")}</p>
      {!progress.workouts ? <p className="-mt-1 mb-4 text-center text-xs text-slate-500">A fresh page. Your completed workouts will show up here.</p> : null}
      <div aria-live="polite" className="flex min-h-[4.5rem] flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-800/70 bg-slate-950/60 px-3.5 py-3">
        <div><p className="text-xs font-bold text-slate-200">{selected.fullLabel}</p><p className="mt-1 text-[11px] text-slate-500">{selected.workouts} {selected.workouts === 1 ? "workout" : "workouts"}<span className="mx-1.5 text-slate-700">/</span>{formatTrainingTime(selected.minutes)} logged</p></div>
        {props.period !== "day" ? <Link aria-label={`View ${selected.fullLabel}`} className={`flex min-h-10 items-center gap-1 text-[11px] font-bold text-lime-400 ${focus}`} href={historyHref(props.period === "year" ? "month" : "day", selected.key, props.timeZone)} scroll={false}>View {props.period === "year" ? "month" : "day"}<Icon name="arrow" className="size-3.5" /></Link> : null}
      </div>
      {today && !isCurrentPeriod ? <Link className={`mt-3 flex min-h-10 items-center justify-center text-xs font-semibold text-slate-400 hover:text-lime-400 ${focus}`} href={historyHref(props.period, today, props.timeZone)} scroll={false}>Back to {periodText}</Link> : null}
    </section>

    <section aria-label="Period summary" className="mt-3 grid grid-cols-2 gap-3">
      <div className={`${card} p-4`}><div className="flex items-center gap-2 text-sky-300"><Icon name="calendar" className="size-4" /><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Active days</p></div><p className="mt-3 text-2xl font-black tracking-tight">{progress.activeDays}<span className="ml-1.5 text-xs font-normal text-slate-500">{progress.activeDays === 1 ? "day" : "days"}</span></p></div>
      <div className={`${card} p-4`}><div className="flex items-center gap-2 text-lime-300"><Icon name={metric === "workouts" ? "clock" : "workout"} className="size-4" /><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{metric === "workouts" ? "Time logged" : "Workouts"}</p></div><p className="mt-3 text-2xl font-black tracking-tight">{metric === "workouts" ? formatTrainingTime(progress.minutes) : progress.workouts}</p></div>
    </section>
    <p className="mt-3 text-center text-[10px] leading-5 text-slate-500">Time logged is the time from starting to finishing a session.</p>

    {props.period !== "year" ? <AttendanceCalendar date={props.date} timeZone={props.timeZone} timestamps={props.attendanceTimestamps} today={today} /> : null}

    <section className="mt-8">
      <div className="flex items-center justify-between gap-3"><h2 className="text-lg font-bold tracking-tight">The work you put in</h2><span className="text-[11px] text-slate-500">{progress.workouts} {progress.workouts === 1 ? "session" : "sessions"}</span></div>
      <p className="mt-1 text-xs text-slate-500">Your completed workouts for {periodLabel(props.period, props.date)}.</p>
      <div className="mt-4 space-y-2.5">{progress.sessions.slice(0, visibleCount).map((session) => <SessionRow key={session.id} session={session} timeZone={props.timeZone} />)}</div>
      {!progress.workouts ? <div className={`${card} mt-4 px-6 py-8 text-center`}><span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-slate-800 text-slate-400"><Icon name="workout" /></span><h3 className="mt-4 font-bold">Room for your next workout.</h3><p className="mt-2 text-xs leading-6 text-slate-500">No completed sessions in this period.<br />Every workout is another step forward.</p><Link className={`mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-lime-400 px-5 text-xs font-bold text-slate-950 ${focus}`} href="/app">Go to my workouts<Icon name="arrow" className="size-3.5" /></Link></div> : null}
      {visibleCount < progress.sessions.length ? <button className={`mt-4 min-h-12 w-full rounded-2xl border border-slate-800 text-xs font-semibold text-slate-300 hover:bg-slate-900 ${focus}`} onClick={() => setVisibleCount((count) => count + 6)} type="button">Show more workouts <span className="ml-1 text-slate-500">({progress.sessions.length - visibleCount} more)</span></button> : null}
    </section>
    <footer className="mt-7 flex items-center justify-center gap-2 text-[11px] text-slate-500"><span className="size-1.5 rounded-full bg-lime-400" /><span>{props.totalWorkouts} {props.totalWorkouts === 1 ? "workout" : "workouts"} in your journey so far</span></footer>
  </main>;
}

function ActivityChart({ buckets, id, metric, onSelect, period, selectedIndex }: { buckets: ProgressBucket[]; id: string; metric: Metric; onSelect: (index: number) => void; period: HistoryPeriod; selectedIndex: number }) {
  const peak = Math.max(0, ...buckets.map((bucket) => bucket[metric]));
  const max = metric === "workouts" ? Math.max(2, Math.ceil(peak / 2) * 2) : Math.max(30, Math.ceil(peak / 30) * 30);
  const labels = new Set(period === "year" ? buckets.map((_, index) => index) : [0, ...buckets.map((_, index) => index).filter((index) => index > 0 && index % (period === "day" ? 6 : 7) === 0), buckets.length - 1]);
  return <div className="mt-6" id={id}>
    <div className="relative pl-7">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-40">{[max, max / 2, 0].map((value, index) => <div className="absolute inset-x-0 flex items-center gap-2" key={index} style={{ top: `${index * 50}%` }}><span className="w-5 shrink-0 -translate-y-1/2 text-right text-[9px] tabular-nums text-slate-600">{value}</span><span className="w-full -translate-y-1/2 border-t border-dashed border-slate-800" /></div>)}</div>
      <div aria-label={`${metric === "workouts" ? "Completed workouts" : "Minutes logged"} by ${period === "day" ? "local hour" : period === "month" ? "day" : "month"}. Select a bar for details. Use left and right arrow keys to explore.`} className={`relative grid h-40 items-end ${period === "year" ? "gap-1.5" : "gap-[3px]"}`} role="group" style={{ gridTemplateColumns: `repeat(${buckets.length}, minmax(0, 1fr))` }}>
        {buckets.map((bucket, index) => <button aria-label={`${bucket.fullLabel}: ${bucket.workouts} ${bucket.workouts === 1 ? "workout" : "workouts"}, ${formatTrainingTime(bucket.minutes)} logged`} aria-pressed={index === selectedIndex} className={`group relative flex h-full min-w-0 items-end rounded-sm outline-offset-2 focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-lime-200 ${focus}`} key={bucket.key} onClick={() => onSelect(index)} onKeyDown={(event) => {
          const next = event.key === "ArrowRight" ? Math.min(buckets.length - 1, index + 1) : event.key === "ArrowLeft" ? Math.max(0, index - 1) : event.key === "Home" ? 0 : event.key === "End" ? buckets.length - 1 : null;
          if (next === null) return;
          event.preventDefault();
          onSelect(next);
          event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>("button")[next]?.focus();
        }} tabIndex={index === selectedIndex ? 0 : -1} title={`${bucket.fullLabel} · ${bucket.workouts} workouts · ${formatTrainingTime(bucket.minutes)}`} type="button"><span aria-hidden="true" className={`w-full rounded-t-[3px] transition-colors motion-reduce:transition-none ${bucket[metric] > 0 ? index === selectedIndex ? "bg-lime-300 shadow-[0_0_16px_-5px_#bef264]" : "bg-lime-400/55 group-hover:bg-lime-300" : index === selectedIndex ? "bg-slate-600" : "bg-slate-800"}`} style={{ height: bucket[metric] > 0 ? `${Math.max(3, bucket[metric] / max * 100)}%` : "3px" }} /></button>)}
      </div>
      <div aria-hidden="true" className={`mt-2 grid h-6 text-center text-[9px] tabular-nums text-slate-500 ${period === "year" ? "gap-1.5" : "gap-[3px]"}`} style={{ gridTemplateColumns: `repeat(${buckets.length}, minmax(0, 1fr))` }}>{buckets.map((bucket, index) => <span className={selectedIndex === index ? "font-bold text-lime-300" : ""} key={bucket.key}>{labels.has(index) ? bucket.label : ""}</span>)}</div>
    </div>
    <details className="mb-3"><summary className={`inline-flex min-h-9 cursor-pointer items-center text-[10px] text-slate-500 hover:text-slate-300 ${focus}`}>View chart data <span aria-hidden="true" className="ml-1">+</span></summary><div className="max-h-48 overflow-auto rounded-xl border border-slate-800"><table className="w-full text-left text-[11px]"><caption className="sr-only">Completed workouts and time logged for each {period === "day" ? "local hour" : period === "month" ? "day" : "month"}</caption><thead className="sticky top-0 bg-slate-950 text-slate-400"><tr><th className="p-2.5 font-medium">{period === "day" ? "Local hour" : period === "month" ? "Day" : "Month"}</th><th className="p-2.5 font-medium">Workouts</th><th className="p-2.5 font-medium">Time</th></tr></thead><tbody>{buckets.map((bucket) => <tr className="border-t border-slate-800 text-slate-400" key={bucket.key}><td className="p-2.5">{bucket.fullLabel}</td><td className="p-2.5">{bucket.workouts}</td><td className="p-2.5">{formatTrainingTime(bucket.minutes)}</td></tr>)}</tbody></table></div></details>
  </div>;
}

function PeriodArrow(props: Props & { amount: -1 | 1 }) {
  const date = shiftHistoryDate(props.date, props.period, props.amount);
  const label = `${props.amount === -1 ? "Previous" : "Next"} ${props.period}`;
  const className = `flex size-10 shrink-0 items-center justify-center rounded-xl border border-slate-800 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white ${focus}`;
  if (!isValidHistoryDate(date)) return <span aria-disabled="true" aria-label={label} className={`${className} opacity-30`}><Icon name="chevron" className={`size-4 ${props.amount === -1 ? "rotate-180" : ""}`} /></span>;
  return <Link aria-label={label} className={className} href={historyHref(props.period, date, props.timeZone)} scroll={false}><Icon name="chevron" className={`size-4 ${props.amount === -1 ? "rotate-180" : ""}`} /></Link>;
}

function AttendanceCalendar({ date, timeZone, timestamps, today }: { date: string; timeZone: string; timestamps: string[]; today: string }) {
  const month = date.slice(0, 7);
  const [year, number] = month.split("-").map(Number);
  const firstWeekday = (new Date(Date.UTC(year, number - 1, 1)).getUTCDay() + 6) % 7;
  const days = new Date(Date.UTC(year, number, 0)).getUTCDate();
  const attendance = useMemo(() => new Set(timestamps.map((value) => localDateKey(value, timeZone)).filter((key) => key.startsWith(date.slice(0, 7)))), [timestamps, timeZone, date]);
  return <details className={`${card} mt-5 overflow-hidden`}><summary className={`flex min-h-20 cursor-pointer list-none items-center gap-3 p-4 ${focus}`}><span className="flex size-10 items-center justify-center rounded-xl bg-slate-800/80 text-slate-400"><Icon name="calendar" className="size-4" /></span><span className="flex-1"><span className="block text-sm font-bold">Attendance calendar</span><span className="mt-1 block text-[11px] text-slate-500">{attendance.size} active {attendance.size === 1 ? "day" : "days"} in {periodLabel("month", date)}</span></span><span aria-hidden="true" className="text-xl text-slate-500">+</span></summary>
    <div className="border-t border-slate-800 px-4 pb-4"><div className="mt-4 grid grid-cols-7 text-center text-[10px] font-bold text-slate-600">{["M", "T", "W", "T", "F", "S", "S"].map((day, index) => <span key={index}>{day}</span>)}</div><div className="mt-3 grid grid-cols-7 gap-1">{Array.from({ length: firstWeekday }, (_, index) => <span key={`blank-${index}`} />)}{Array.from({ length: days }, (_, index) => {
      const key = `${month}-${String(index + 1).padStart(2, "0")}`;
      const attended = attendance.has(key);
      return <Link aria-label={`${periodLabel("day", key)}${attended ? ", workout completed" : ", no workouts"}${today === key ? ", today" : ""}`} className={`flex aspect-square items-center justify-center rounded-xl text-xs ${focus} ${attended ? "bg-lime-400/15 font-bold text-lime-300" : "text-slate-500 hover:bg-slate-800"} ${today === key ? "ring-1 ring-inset ring-slate-600" : ""}`} href={historyHref("day", key, timeZone)} key={key} scroll={false}>{index + 1}</Link>;
    })}</div><div className="mt-4 flex items-center justify-center gap-2 text-[10px] text-slate-500"><span className="size-1.5 rounded-full bg-lime-400" />Completed workout<span className="ml-2 size-2 rounded-sm ring-1 ring-slate-500" />Today</div></div>
  </details>;
}

function SessionRow({ session, timeZone }: { session: HistorySession; timeZone: string }) {
  const completed = new Date(session.completed_at!);
  const day = new Intl.DateTimeFormat("en-US", { day: "2-digit", timeZone }).format(completed);
  const month = new Intl.DateTimeFormat("en-US", { month: "short", timeZone }).format(completed);
  const time = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone }).format(completed);
  return <Link className={`${card} flex min-h-24 items-center gap-3 p-3.5 transition-colors hover:border-slate-600 hover:bg-slate-900 ${focus}`} href={`/app/history/${session.id}`}>
    <span className="flex w-12 shrink-0 flex-col items-center rounded-xl bg-slate-950/80 py-2"><span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">{month}</span><span className="mt-0.5 text-xl font-bold tabular-nums leading-none text-slate-200">{day}</span></span>
    <span className="min-w-0 flex-1"><strong className="block truncate text-sm">{session.name}</strong><span className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-slate-500"><span>{time}</span><span aria-hidden="true">·</span><span>{formatTrainingTime(sessionMinutes(session))} logged</span></span></span>
    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-lime-400/10 text-lime-400"><Icon name="check" className="size-3.5" /></span><Icon name="chevron" className="size-3 shrink-0 text-slate-600" />
  </Link>;
}

function Icon({ name, className = "size-5" }: { name: "flame" | "play" | "arrow" | "calendar" | "clock" | "workout" | "chevron" | "check"; className?: string }) {
  const paths = {
    flame: "M12 3c1 5 5 5 5 10a5 5 0 0 1-10 0c0-3 2-5 3-6 0 3 2 3 2 3s2-2 0-7Z",
    play: "m9 5 10 7-10 7V5Z",
    arrow: "M5 12h14m-6-6 6 6-6 6",
    calendar: "M8 3v4m8-4v4M4 10h16M6 5h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Zm2 9h2m4 0h2m-8 3h2",
    clock: "M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
    workout: "m6 8 10 10M4 10l6-6m4 16 6-6M2 8l6-6m8 20 6-6",
    chevron: "m9 5 7 7-7 7",
    check: "m5 12 4 4L19 6",
  };
  return <svg aria-hidden="true" className={className} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" viewBox="0 0 24 24"><path d={paths[name]} /></svg>;
}
function emptySubscribe() { return () => undefined; }
