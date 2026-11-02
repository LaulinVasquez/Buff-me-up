import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { UserMenu } from "@/components/auth/user-menu";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { ApplicationShell } from "@/components/application-shell";
import { ThemeProvider } from "@/components/appearance/theme-provider";
import { normalizeAccentTheme } from "@/lib/appearance/themes";
import { LaunchSplash } from "@/components/launch-splash";

export default async function ApplicationLayout({ children }: Readonly<{ children: ReactNode }>) {
  if (!hasSupabaseConfig()) redirect("/?error=auth_unavailable");
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims) redirect("/");

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: profile } = await supabase.from("gym_profiles").select("full_name, avatar_url, accent_theme").eq("id", user.id).maybeSingle();
  const metadata = user.user_metadata;
  const metadataName = typeof metadata.full_name === "string" ? metadata.full_name : typeof metadata.name === "string" ? metadata.name : null;
  const metadataAvatar = typeof metadata.avatar_url === "string" ? metadata.avatar_url : typeof metadata.picture === "string" ? metadata.picture : null;
  const name = profile?.full_name ?? metadataName ?? user.email?.split("@")[0] ?? "Gym member";
  const avatarUrl = profile?.avatar_url ?? metadataAvatar;

  return <ThemeProvider key={user.id} savedTheme={normalizeAccentTheme(profile?.accent_theme)}><ApplicationShell userMenu={<UserMenu avatarUrl={avatarUrl} name={name} />}>
    <LaunchSplash />
    {children}
  </ApplicationShell></ThemeProvider>;
}
