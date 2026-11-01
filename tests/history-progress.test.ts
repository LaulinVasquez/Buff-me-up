import assert from "node:assert/strict";
import test from "node:test";
import {
  buildHistoryProgress, formatTrainingTime, historyHref, historyQueryWindow, historyRange,
  isHistoryPeriod, isValidHistoryDate, sessionMinutes, shiftHistoryDate, type HistorySession,
} from "../lib/history/progress";

function session(id: string, completed_at: string, minutes = 45, status = "completed"): HistorySession {
  return { id, name: "Synthetic workout", status, completed_at, started_at: new Date(new Date(completed_at).getTime() - minutes * 60000).toISOString() };
}

test("month buckets include rest days and handle leap years", () => {
  const leap = buildHistoryProgress([session("a", "2024-02-29T12:00:00Z")], "month", "2024-02-12", "UTC");
  assert.equal(leap.buckets.length, 29);
  assert.equal(leap.buckets[28].workouts, 1);
  assert.equal(leap.buckets[0].workouts, 0);
  assert.equal(buildHistoryProgress([], "month", "2025-02-12", "UTC").buckets.length, 28);
});

test("month boundaries follow the user's timezone rather than UTC", () => {
  const progress = buildHistoryProgress([
    session("in", "2026-11-01T00:30:00Z"), session("out", "2026-10-01T00:30:00Z"),
  ], "month", "2026-10-15", "America/Boise");
  assert.equal(progress.workouts, 1);
  assert.equal(progress.sessions[0].id, "in");
  assert.equal(progress.buckets[30].workouts, 1);
});

test("year buckets handle the local year boundary and include all twelve months", () => {
  const progress = buildHistoryProgress([
    session("last", "2027-01-01T01:00:00Z"), session("first", "2026-01-01T01:00:00Z"),
  ], "year", "2026-06-15", "America/Boise");
  assert.equal(progress.buckets.length, 12);
  assert.equal(progress.workouts, 1);
  assert.equal(progress.buckets[11].workouts, 1);
  assert.equal(progress.buckets[0].workouts, 0);
});

test("daily progress groups both repeated DST hours and uses real elapsed time", () => {
  const progress = buildHistoryProgress([
    session("first", "2026-11-01T07:30:00Z", 30), session("second", "2026-11-01T08:30:00Z", 60),
    session("tomorrow", "2026-11-02T08:30:00Z"),
  ], "day", "2026-11-01", "America/Boise");
  assert.equal(progress.buckets.length, 24);
  assert.equal(progress.buckets[1].workouts, 2);
  assert.equal(progress.buckets[1].minutes, 90);
  assert.equal(progress.activeDays, 1);
  assert.equal(progress.workouts, 2);
});

test("spring DST produces no attendance in the skipped local hour", () => {
  const progress = buildHistoryProgress([
    session("a", "2026-03-08T08:30:00Z"), session("b", "2026-03-08T09:30:00Z"),
  ], "day", "2026-03-08", "America/Boise");
  assert.equal(progress.buckets[1].workouts, 1);
  assert.equal(progress.buckets[2].workouts, 0);
  assert.equal(progress.buckets[3].workouts, 1);
});

test("active days are unique and graph totals match sessions", () => {
  const progress = buildHistoryProgress([
    session("a", "2026-11-04T12:00:00Z", 30), session("b", "2026-11-04T18:00:00Z", 45),
    session("c", "2026-11-06T12:00:00Z", 60),
  ], "month", "2026-11-01", "UTC");
  assert.equal(progress.activeDays, 2);
  assert.equal(progress.workouts, 3);
  assert.equal(progress.minutes, 135);
  assert.equal(progress.buckets.reduce((sum, bucket) => sum + bucket.workouts, 0), 3);
  assert.equal(progress.buckets.reduce((sum, bucket) => sum + bucket.minutes, 0), 135);
  assert.deepEqual(progress.sessions.map((item) => item.id), ["c", "b", "a"]);
});

test("in-progress/cancelled or invalid completion timestamps never count", () => {
  const rows = [session("a", "2026-11-01T12:00:00Z", 30, "in_progress"), session("b", "2026-11-01T12:00:00Z", 30, "cancelled"),
    { ...session("c", "2026-11-01T12:00:00Z"), completed_at: null },
    { ...session("d", "2026-11-01T12:00:00Z"), completed_at: "invalid" }];
  const progress = buildHistoryProgress(rows, "month", "2026-11-01", "UTC");
  assert.equal(progress.workouts, 0);
  assert.equal(progress.minutes, 0);
  assert.equal(progress.activeDays, 0);
});

test("calendar navigation clamps month/year dates without skipping February", () => {
  assert.equal(shiftHistoryDate("2026-01-31", "month", 1), "2026-02-28");
  assert.equal(shiftHistoryDate("2024-02-29", "year", 1), "2025-02-28");
  assert.equal(shiftHistoryDate("2026-12-31", "day", 1), "2027-01-01");
  assert.equal(shiftHistoryDate("2026-01-31", "month", -1), "2025-12-31");
});

test("invalid date/view input is rejected before a database query", () => {
  for (const value of ["2026-00-01", "2026-13-01", "2026-02-29", "2026-11-31", "2026-1-01", "", "0001-01-01", "9999-12-31"]) assert.equal(isValidHistoryDate(value), false, value);
  assert.equal(isValidHistoryDate("2024-02-29"), true);
  assert.equal(isHistoryPeriod("week"), false);
  assert.equal(isHistoryPeriod("year"), true);
  assert.throws(() => historyRange("month", "2026-13-01"), /Invalid history date/);
});

test("query windows include extreme UTC offsets and cross-year padding", () => {
  const window = historyQueryWindow("year", "2026-04-12");
  assert.equal(window.start, "2025-12-30T00:00:00.000Z");
  assert.equal(window.end, "2027-01-03T00:00:00.000Z");
  const plus14 = buildHistoryProgress([session("a", "2025-12-31T11:00:00Z")], "year", "2026-01-01", "Pacific/Kiritimati");
  assert.equal(plus14.workouts, 1);
});

test("history links preserve the view, selected date, and IANA timezone", () => {
  const url = new URL(historyHref("year", "2026-11-01", "America/Boise"), "https://example.test");
  assert.equal(url.searchParams.get("view"), "year");
  assert.equal(url.searchParams.get("date"), "2026-11-01");
  assert.equal(url.searchParams.get("tz"), "America/Boise");
});

test("duration formatting does not invent time or allow negative elapsed minutes", () => {
  assert.equal(formatTrainingTime(0), "0m");
  assert.equal(formatTrainingTime(0.25), "<1m");
  assert.equal(formatTrainingTime(90), "1h 30m");
  assert.equal(formatTrainingTime(120), "2h");
  const invalid = { ...session("a", "2026-11-01T12:00:00Z"), started_at: "2026-11-02T12:00:00Z" };
  assert.equal(sessionMinutes(invalid), 0);
});
