import { NextRequest, NextResponse } from "next/server";
import { searchCatalog } from "@/lib/exercises/provider";

export async function GET(request: NextRequest) {
  const p = request.nextUrl.searchParams;
  const data = await searchCatalog({ query: p.get("q") ?? "", muscle: p.get("muscle") ?? undefined, equipment: p.get("equipment") ?? undefined, limit: Number(p.get("limit") ?? 20), offset: Number(p.get("offset") ?? 0) });
  return NextResponse.json(data, { headers: { "Cache-Control": "private, max-age=60, stale-while-revalidate=300" } });
}
