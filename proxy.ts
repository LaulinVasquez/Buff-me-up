import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";
export async function proxy(request: NextRequest) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) return NextResponse.next({ request });
  try {
    return await updateSession(request);
  } catch {
    if (request.nextUrl.pathname.startsWith("/app")) {
      return NextResponse.redirect(new URL("/?error=auth_unavailable", request.url));
    }
    return NextResponse.next({ request });
  }
}
export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"] };
