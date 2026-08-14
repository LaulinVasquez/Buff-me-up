import Image from "next/image";
import { redirect } from "next/navigation";
import { signOut } from "@/app/app/actions";
import { ConsistencySummary } from "@/components/history/consistency-summary";
import { LocalDateTime } from "@/components/local-date";
import { createClient } from "@/lib/supabase/server";
import { getWorkoutStatsData } from "@/lib/workouts/history";

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");
  const [{ data: profile }, stats] = await Promise.all([
    supabase.from("gym_profiles").select("*").eq("id", user.id).maybeSingle(),
    getWorkoutStatsData(),
  ]);
  const metadata = user.user_metadata;
  const name = profile?.full_name ?? (typeof metadata.full_name === "string" ? metadata.full_name : null) ?? user.email?.split("@")[0] ?? "Gym member";
  const avatar = profile?.avatar_url ?? (typeof metadata.avatar_url === "string" ? metadata.avatar_url : null);

  return <main className="pb-28 pt-10">
    <p className="text-sm font-bold uppercase tracking-[0.2em] text-lime-400">Profile</p>
    <section className="mt-7 flex items-center gap-4 rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
      {avatar ? <Image alt="" className="size-16 rounded-full object-cover" height={64} src={avatar} unoptimized width={64} /> : <span className="flex size-16 items-center justify-center rounded-full bg-lime-400 text-2xl font-black text-slate-950">{name.charAt(0).toUpperCase()}</span>}
      <div className="min-w-0"><h1 className="truncate text-xl font-bold">{name}</h1><p className="truncate text-sm text-slate-400">{user.email}</p><p className="mt-1 text-xs text-slate-500">Member since {profile?.created_at ? <LocalDateTime mode="date" value={profile.created_at} /> : "recently"}</p></div>
    </section>
    <section className="mt-6 space-y-3"><div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4"><p className="text-xs font-bold uppercase text-slate-500">Total workouts</p><p className="mt-2 text-xl font-black">{stats.totalWorkouts}</p></div><ConsistencySummary timestamps={stats.attendanceTimestamps} /></section>
    <form action={signOut} className="mt-8"><button className="min-h-12 w-full rounded-xl border border-slate-700 font-semibold text-slate-200" type="submit">Sign out</button></form>
  </main>;
}
