import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("url");
  const key = process.env.MUSCLEWIKI_API_KEY;
  if (!raw || !key) return new NextResponse("Media unavailable", { status: 404 });
  const url = new URL(raw);
  if (url.protocol !== "https:" || url.hostname !== "api.musclewiki.com") return new NextResponse("Invalid media URL", { status: 400 });
  const headers: HeadersInit = { "X-API-Key": key };
  const range = request.headers.get("range"); if (range) headers.Range = range;
  const response = await fetch(url, { headers, cache: "no-store" });
  const outputHeaders = new Headers();
  for (const name of ["content-type", "content-length", "content-range", "accept-ranges"]) { const value = response.headers.get(name); if (value) outputHeaders.set(name, value); }
  outputHeaders.set("Cache-Control", "private, max-age=300");
  return new NextResponse(response.body, { status: response.status, headers: outputHeaders });
}
