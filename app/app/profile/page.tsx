import { NutritionPreferencesForm } from "@/components/nutrition/preferences-form";
import { getNutritionPreferences } from "@/lib/nutrition/service";
import { saveNutritionPreferencesAction } from "@/app/app/nutrition/actions";
import { DataExport } from "@/components/progress/data-export";
import { GymSettings } from "@/components/gyms/gym-settings";
import { getGymLocations } from "@/lib/gyms/service";
import { saveGymAction, selectGymAction } from "./gym-actions";
import { GoalSettings } from "@/components/progress/goal-settings";
import { saveGoalAction } from "./goal-actions";
import Image from "next/image";
import { redirect } from "next/navigation";
import { signOut } from "@/app/app/actions";
import { ConsistencySummary } from "@/components/history/consistency-summary";
import { LocalDateTime } from "@/components/local-date";
import { createClient } from "@/lib/supabase/server";
import { AppearanceSettings } from "@/components/appearance/appearance-settings";
import { saveAppearanceAction } from "./appearance-actions";
import { getWorkoutStatsData } from "@/lib/workouts/history";

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");
  const [{ data: profile }, stats, gyms, nutrition] = await Promise.all([
    supabase.from("gym_profiles").select("*").eq("id", user.id).maybeSingle(),
    getWorkoutStatsData(),
    getGymLocations().catch(() => null),
    getNutritionPreferences(),
  ]);
  const metadata = user.user_metadata;
  const name = profile?.full_name ?? (typeof metadata.full_name === "string" ? metadata.full_name : null) ?? user.email?.split("@")[0] ?? "Gym member";
  const avatar = profile?.avatar_url ?? (typeof metadata.avatar_url === "string" ? metadata.avatar_url : null);

  return <main className="pb-28 pt-10 lg:pb-8">
    <p className="text-sm font-bold uppercase tracking-[0.2em] text-accent-400">Profile</p>
    <div className="mt-7 grid items-start gap-6 md:grid-cols-2">
    <section className="flex min-w-0 items-center gap-4 rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
      {avatar ? <Image alt="" className="size-16 shrink-0 rounded-full object-cover" height={64} src={avatar} unoptimized width={64} /> : <span className="flex size-16 shrink-0 items-center justify-center rounded-full bg-accent-400 text-2xl font-black text-slate-950">{name.charAt(0).toUpperCase()}</span>}
      <div className="min-w-0"><h1 className="truncate text-xl font-bold">{name}</h1><p className="truncate text-sm text-slate-400">{user.email}</p><p className="mt-1 text-xs text-slate-500">Member since {profile?.created_at ? <LocalDateTime mode="date" value={profile.created_at} /> : "recently"}</p></div>
    </section>
    <section className="space-y-3 md:col-start-2 md:row-span-2"><div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4"><p className="text-xs font-bold uppercase text-slate-500">Total workouts</p><p className="mt-2 text-xl font-black">{stats.totalWorkouts}</p></div><ConsistencySummary timestamps={stats.attendanceTimestamps} /></section>
    <form action={signOut} className="md:col-start-1 md:row-start-2"><button className="min-h-12 w-full rounded-xl border border-slate-700 font-semibold text-slate-200" type="submit">Sign out</button></form>
    </div>
    {gyms ? <GymSettings gyms={gyms} saveAction={saveGymAction} selectAction={selectGymAction} /> : <p className="mt-8 text-sm text-slate-400">Gym setups are temporarily unavailable.</p>}
    {nutrition.available ? <NutritionPreferencesForm key={nutrition.preferences?.revision ?? "new"} preferences={nutrition.preferences} action={saveNutritionPreferencesAction} /> : <p className="mt-6 text-sm text-slate-400">Nutrition preferences are unavailable. Try again later.</p>}
    <GoalSettings key={profile?.weekly_goal ?? 3} goal={profile?.weekly_goal ?? 3} action={saveGoalAction} />
    <AppearanceSettings action={saveAppearanceAction} />
    <DataExport />
  </main>;
}
