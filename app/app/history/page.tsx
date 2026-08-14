import { HistoryBootstrap } from "@/components/history/history-bootstrap";
import { HistoryView } from "@/components/history/history-view";
import { isValidTimeZone } from "@/lib/dates/local";
import { getCurrentWorkoutSummary, getWorkoutHistory, getWorkoutHistoryByMonth, getWorkoutStatsData } from "@/lib/workouts/history";

type Props = Readonly<{ searchParams: Promise<{ month?: string; tz?: string }> }>;

export default async function HistoryPage({ searchParams }: Props) {
  const { month, tz } = await searchParams;
  if (!month || !/^\d{4}-\d{2}$/.test(month) || !tz || !isValidTimeZone(tz)) return <HistoryBootstrap />;

  const [monthWorkouts, recentWorkouts, stats, currentWorkout] = await Promise.all([
    getWorkoutHistoryByMonth(month),
    getWorkoutHistory(10),
    getWorkoutStatsData(),
    getCurrentWorkoutSummary(),
  ]);

  return <HistoryView attendanceTimestamps={stats.attendanceTimestamps} currentWorkout={currentWorkout} month={month} monthWorkouts={monthWorkouts} recentWorkouts={recentWorkouts} timeZone={tz} totalWorkouts={stats.totalWorkouts} />;
}
