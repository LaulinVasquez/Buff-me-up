"use client";

import { useEffect } from "react";
import { App } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { useRouter } from "next/navigation";
import { isNativeApp, isNativeAuthCallback } from "@/lib/capacitor/runtime";
import { createClient } from "@/lib/supabase/client";

export function NativeAuthListener() {
  const router = useRouter();

  useEffect(() => {
    if (!isNativeApp()) return;

    let active = true;
    let processingUrl: string | null = null;

    async function handleUrl(rawUrl: string) {
      if (!active || processingUrl === rawUrl) return;

      let callbackUrl: URL;
      try {
        callbackUrl = new URL(rawUrl);
      } catch {
        return;
      }

      // Never navigate arbitrary deep links delivered to the app.
      if (!isNativeAuthCallback(callbackUrl)) return;
      processingUrl = rawUrl;

      try {
        await Browser.close().catch(() => undefined);

        const code = callbackUrl.searchParams.get("code");
        if (!code) {
          router.replace("/?error=invalid_callback");
          return;
        }

        const supabase = createClient();
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        if (error || !data.user) {
          router.replace("/?error=callback_failed");
          return;
        }

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
          router.replace("/?error=profile_failed");
          return;
        }

        router.replace("/app");
        router.refresh();
      } catch {
        router.replace("/?error=auth_unavailable");
      } finally {
        processingUrl = null;
      }
    }

    const listener = App.addListener("appUrlOpen", ({ url }) => {
      void handleUrl(url);
    });
    void App.getLaunchUrl().then((launch) => {
      if (launch?.url) void handleUrl(launch.url);
    });

    return () => {
      active = false;
      void listener.then((handle) => handle.remove());
    };
  }, [router]);

  return null;
}
