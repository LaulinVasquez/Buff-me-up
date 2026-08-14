import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  if (!code) return redirectWithError(url, "invalid_callback");

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error || !data.user) return redirectWithError(url, "callback_failed");

    const metadata = data.user.user_metadata;
    const fullName = typeof metadata.full_name === "string"
      ? metadata.full_name
      : typeof metadata.name === "string" ? metadata.name : null;
    const avatarUrl = typeof metadata.avatar_url === "string"
      ? metadata.avatar_url
      : typeof metadata.picture === "string" ? metadata.picture : null;

    const { error: profileError } = await supabase.from("gym_profiles").upsert(
      { id: data.user.id, full_name: fullName, avatar_url: avatarUrl },
      { onConflict: "id" },
    );
    if (profileError) {
      await supabase.auth.signOut();
      return redirectWithError(url, "profile_failed");
    }

    return NextResponse.redirect(new URL("/app", url.origin));
  } catch {
    return redirectWithError(url, "auth_unavailable");
  }
}

function redirectWithError(url: URL, error: string) {
  const destination = new URL("/", url.origin);
  destination.searchParams.set("error", error);
  return NextResponse.redirect(destination);
}
