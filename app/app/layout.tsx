import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { UserMenu } from "@/components/auth/user-menu";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { AppNavigation } from "@/components/navigation/app-navigation";

export default async function ApplicationLayout({ children }: Readonly<{ children: ReactNode }>) {
  if (!hasSupabaseConfig()) redirect("/?error=auth_unavailable");
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims) redirect("/");

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: profile } = await supabase.from("gym_profiles").select("full_name, avatar_url").eq("id", user.id).maybeSingle();
  const metadata = user.user_metadata;
  const metadataName = typeof metadata.full_name === "string" ? metadata.full_name : typeof metadata.name === "string" ? metadata.name : null;
  const metadataAvatar = typeof metadata.avatar_url === "string" ? metadata.avatar_url : typeof metadata.picture === "string" ? metadata.picture : null;
  const name = profile?.full_name ?? metadataName ?? user.email?.split("@")[0] ?? "Gym member";
  const avatarUrl = profile?.avatar_url ?? metadataAvatar;

  return <div className="mx-auto min-h-dvh w-full max-w-lg px-[max(1.25rem,env(safe-area-inset-left),env(safe-area-inset-right))] pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[calc(1.5rem+env(safe-area-inset-top))] sm:px-[max(2rem,env(safe-area-inset-left),env(safe-area-inset-right))]">
    <header className="flex min-h-14 items-center justify-between gap-4">
      <p className="shrink-0 text-sm font-bold uppercase tracking-[0.2em] text-lime-400">Buff Me Up</p>
      <UserMenu avatarUrl={avatarUrl} name={name} />
    </header>
    {children}
    <AppNavigation />
  </div>;
}
