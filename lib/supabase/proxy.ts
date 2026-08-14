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
  const { data } = await supabase.auth.getClaims();
  const isAppRoute = request.nextUrl.pathname.startsWith("/app");
  const isLandingPage = request.nextUrl.pathname === "/";
  if (!data?.claims && isAppRoute) return NextResponse.redirect(new URL("/", request.url));
  if (data?.claims && isLandingPage) return NextResponse.redirect(new URL("/app", request.url));
  return response;
}
