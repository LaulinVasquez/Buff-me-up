import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseConfig } from "./config";
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const { url, publishableKey } = getSupabaseConfig();
  const supabase = createServerClient(url, publishableKey, { cookies: {
    getAll: () => request.cookies.getAll(),
    setAll(items) {
      items.forEach(({ name, value }) => request.cookies.set(name, value));
      response = NextResponse.next({ request });
      items.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
    },
  }});
  // Use the same authoritative session check as the protected app layout.
  // A locally cached JWT can still produce claims after its server session is
  // no longer valid, which otherwise creates a / -> /app -> / redirect loop.
  const { data: { user } } = await supabase.auth.getUser();
  const isAppRoute = request.nextUrl.pathname.startsWith("/app");
  const isLandingPage = request.nextUrl.pathname === "/";
  if (!user && isAppRoute) return NextResponse.redirect(new URL("/", request.url));
  if (user && isLandingPage) return NextResponse.redirect(new URL("/app", request.url));
  return response;
}
