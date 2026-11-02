import { WeeklyReview } from "@/components/progress/weekly-review";
import { getProgressReviewData } from "@/lib/progress/service";
import { HistoryBootstrap } from "@/components/history/history-bootstrap";
import { HistoryView } from "@/components/history/history-view";
import { isValidTimeZone } from "@/lib/dates/local";
import { isHistoryPeriod, isValidHistoryDate } from "@/lib/history/progress";
import { getCurrentWorkoutSummary, getHistoryPeriodSessions, getWorkoutStatsData } from "@/lib/workouts/history";

type Props = Readonly<{ searchParams: Promise<{ month?: string; date?: string; view?: string; tz?: string }> }>;

export default async function HistoryPage({ searchParams }: Props) {
  const { month, date: requestedDate, view, tz } = await searchParams;
  const date = requestedDate ?? (month ? `${month}-01` : "");
  const period = isHistoryPeriod(view) ? view : "month";
  if (!isValidHistoryDate(date) || !tz || !isValidTimeZone(tz)) return <HistoryBootstrap />;

  const [sessions, stats, currentWorkout, review] = await Promise.all([
    getHistoryPeriodSessions(period, date),
    getWorkoutStatsData(),
    getCurrentWorkoutSummary(),
    getProgressReviewData().catch(() => null),
  ]);

  return <HistoryView review={review ? <WeeklyReview {...review} timestamps={stats.attendanceTimestamps} timeZone={tz} /> : <p className="mt-6 text-sm text-slate-400">Weekly review is temporarily unavailable.</p>} key={`${period}-${date}-${tz}`} attendanceTimestamps={stats.attendanceTimestamps} currentWorkout={currentWorkout} date={date} period={period} sessions={sessions} timeZone={tz} totalWorkouts={stats.totalWorkouts} />;
}
