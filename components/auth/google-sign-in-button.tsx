"use client";

import { useState } from "react";
import { Browser } from "@capacitor/browser";
import { isNativeApp, NATIVE_AUTH_REDIRECT_URI } from "@/lib/capacitor/runtime";
import { createClient } from "@/lib/supabase/client";

export function GoogleSignInButton() {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function signIn() {
    setError(null);
    setIsLoading(true);
    try {
      const supabase = createClient();
      const native = isNativeApp();
      const { data, error: signInError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: native
            ? NATIVE_AUTH_REDIRECT_URI
            : `${window.location.origin}/auth/callback`,
          skipBrowserRedirect: native,
        },
      });
      if (signInError) {
        setError("We couldn't start Google sign-in. Please try again.");
        setIsLoading(false);
        return;
      }
      if (native) {
        if (!data.url) throw new Error("Supabase did not return an OAuth URL");
        await Browser.open({ url: data.url });
      }
    } catch {
      setError("Sign-in is not configured yet. Please contact the site owner.");
      setIsLoading(false);
    }
  }

  return <div className="mt-9">
    <button className="flex min-h-14 w-full items-center justify-center gap-3 rounded-2xl bg-white px-6 font-bold text-slate-950 transition-colors hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-lime-400 disabled:cursor-wait disabled:opacity-70" disabled={isLoading} onClick={signIn} type="button">
      <GoogleMark />{isLoading ? "Connecting..." : "Continue with Google"}
    </button>
    {error ? <p className="mt-4 text-sm leading-6 text-red-300" role="alert">{error}</p> : null}
  </div>;
}

function GoogleMark() {
  return <svg aria-hidden="true" className="size-5" viewBox="0 0 24 24">
    <path d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.9h5.4a4.6 4.6 0 0 1-2 3v2.5h3.3c1.9-1.8 2.9-4.4 2.9-7.4Z" fill="#4285F4" />
    <path d="M12 22c2.7 0 5-.9 6.7-2.4l-3.3-2.5c-.9.6-2.1 1-3.4 1a5.9 5.9 0 0 1-5.5-4.1H3.1v2.6A10 10 0 0 0 12 22Z" fill="#34A853" />
    <path d="M6.5 14a6 6 0 0 1 0-3.9V7.4H3.1a10 10 0 0 0 0 9.2L6.5 14Z" fill="#FBBC05" />
    <path d="M12 6c1.5 0 2.8.5 3.9 1.5l2.9-2.9A9.7 9.7 0 0 0 3.1 7.4l3.4 2.7A5.9 5.9 0 0 1 12 6Z" fill="#EA4335" />
  </svg>;
}
