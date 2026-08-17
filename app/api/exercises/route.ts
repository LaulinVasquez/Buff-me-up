import { NextRequest, NextResponse } from "next/server";
import { searchCatalog } from "@/lib/exercises/provider";

export async function GET(request: NextRequest) {
  const p = request.nextUrl.searchParams;
  const direction = p.get("direction") === "before" ? "before" : "after";
  const data = await searchCatalog({ query: p.get("q") ?? "", muscle: p.get("muscle") ?? undefined, equipment: p.get("equipment") ?? undefined, limit: Number(p.get("limit") ?? 20), cursor: p.get("cursor") ?? undefined, direction });
  return NextResponse.json(data, { headers: { "Cache-Control": "private, max-age=60, stale-while-revalidate=300" } });
}
