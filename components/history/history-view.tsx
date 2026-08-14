"use client";

import Link from "next/link";
import type { HistoryWorkout } from "@/lib/workouts/history";
import { calculateCurrentStreak, localDateKey } from "@/lib/dates/local";

type Props = Readonly<{
  month: string;
  timeZone: string;
  monthWorkouts: HistoryWorkout[];
  recentWorkouts: HistoryWorkout[];
  totalWorkouts: number;
  attendanceTimestamps: string[];
  currentWorkout: { id: string; name: string; started_at: string } | null;
}>;

export function HistoryView(props: Props) {
  const { year, monthIndex } = parseMonth(props.month);
  const monthPrefix = props.month;
  const visibleWorkouts = props.monthWorkouts.filter((item) => item.completed_at && localDateKey(item.completed_at, props.timeZone).startsWith(monthPrefix));
  const attendanceDays = new Set(visibleWorkouts.flatMap((item) => item.completed_at ? [localDateKey(item.completed_at, props.timeZone)] : []));
  const streak = calculateCurrentStreak(props.attendanceTimestamps, props.timeZone);
  const label = new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(year, monthIndex, 1)));
  const firstWeekday = (new Date(Date.UTC(year, monthIndex, 1)).getUTCDay() + 6) % 7;
  const dayCount = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();

  return <main className="pb-28 pt-10">
    <p className="text-sm font-bold uppercase tracking-[0.2em] text-lime-400">History</p>
    <h1 className="mt-3 text-3xl font-black">Your consistency</h1>
    {props.currentWorkout ? <Link className="mt-6 flex min-h-14 items-center justify-between rounded-2xl border border-lime-400/30 bg-lime-400/10 p-4" href={`/app/workout/${props.currentWorkout.id}`}><span><span className="block text-xs font-bold uppercase text-lime-400">Workout in progress</span><strong className="mt-1 block">{props.currentWorkout.name}</strong></span><span className="font-bold text-lime-400">Continue →</span></Link> : null}

    <section className="mt-8 rounded-3xl border border-slate-800 bg-slate-900/70 p-4">
      <div className="flex items-center justify-between gap-2">
        <MonthLink month={shiftMonth(props.month, -1)} timeZone={props.timeZone} label="‹" />
        <h2 className="text-lg font-bold">{label}</h2>
        <MonthLink month={shiftMonth(props.month, 1)} timeZone={props.timeZone} label="›" />
      </div>
      <div className="mt-5 grid grid-cols-7 text-center text-xs font-bold text-slate-500">{["M","T","W","T","F","S","S"].map((day, index) => <span key={`${day}${index}`}>{day}</span>)}</div>
      <div className="mt-3 grid grid-cols-7 gap-1">{Array.from({ length: firstWeekday }, (_, index) => <span key={`blank-${index}`} />)}{Array.from({ length: dayCount }, (_, index) => {
        const day = index + 1;
        const key = `${props.month}-${String(day).padStart(2, "0")}`;
        const marked = attendanceDays.has(key);
        return <div className={`relative flex aspect-square items-center justify-center rounded-xl text-sm ${marked ? "bg-lime-400 font-black text-slate-950" : "text-slate-300"}`} key={key}>{day}{marked ? <span className="sr-only"> workout completed</span> : null}</div>;
      })}</div>
      <p className="mt-4 text-center text-sm text-slate-400">{visibleWorkouts.length ? `${visibleWorkouts.length} completed ${visibleWorkouts.length === 1 ? "workout" : "workouts"}` : "No workouts this month."}</p>
    </section>

    <section className="mt-6 grid grid-cols-2 gap-3">
      <Stat label="This month" value={`${visibleWorkouts.length} workouts`} />
      <Stat label="Gym days" value={String(attendanceDays.size)} />
      <Stat label="Current streak" value={`${streak} ${streak === 1 ? "day" : "days"}`} />
      <Stat label="All time" value={`${props.totalWorkouts} workouts`} />
    </section>

    <section className="mt-10"><h2 className="text-xl font-bold">Recent workouts</h2>
      <div className="mt-4 space-y-3">{props.recentWorkouts.length ? props.recentWorkouts.map((workout) => <Link className="flex min-h-20 items-center justify-between rounded-2xl border border-slate-800 bg-slate-900/70 p-4" href={`/app/history/${workout.id}`} key={workout.id}><span><span className="text-xs font-semibold text-lime-400">{formatDate(workout.completed_at, props.timeZone)}</span><strong className="mt-1 block">{workout.name}</strong><span className="text-sm text-slate-500">{workout.gym_workout_exercises.length} exercises · {duration(workout.started_at, workout.completed_at)}</span></span><span className="text-slate-500">›</span></Link>) : <p className="rounded-2xl border border-dashed border-slate-700 p-5 text-slate-400">No workouts yet. Complete your first workout and it will show up here.</p>}</div>
    </section>
  </main>;
}

function MonthLink({ month, timeZone, label }: Readonly<{ month: string; timeZone: string; label: string }>) { return <Link aria-label={label === "‹" ? "Previous month" : "Next month"} className="flex min-h-11 min-w-11 items-center justify-center rounded-xl bg-slate-800 text-2xl" href={`/app/history?month=${month}&tz=${encodeURIComponent(timeZone)}`}>{label}</Link>; }
function Stat({ label, value }: Readonly<{ label: string; value: string }>) { return <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4"><p className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</p><p className="mt-2 text-lg font-black">{value}</p></div>; }
function parseMonth(month: string) { const [year, value] = month.split("-").map(Number); return { year, monthIndex: value - 1 }; }
function shiftMonth(month: string, amount: number) { const { year, monthIndex } = parseMonth(month); const date = new Date(Date.UTC(year, monthIndex + amount, 1)); return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`; }
function formatDate(value: string | null, timeZone: string) { return value ? new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", timeZone }).format(new Date(value)) : ""; }
function duration(start: string, end: string | null) { if (!end) return "—"; const minutes = Math.max(1, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000)); return `${minutes} min`; }
