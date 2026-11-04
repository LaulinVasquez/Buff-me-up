import { NextRequest, NextResponse } from "next/server";
import { nutritionClient } from "@/lib/nutrition/service";
import { searchFoods, usdaConfigured } from "@/lib/nutrition/usda-server";
const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };
export async function GET(request: NextRequest) {
  let client;
  try { client = await nutritionClient(); } catch { return NextResponse.json({ error: "Sign in to search foods." }, { status: 401, headers }); }
  const query = (request.nextUrl.searchParams.get("q") ?? "").trim();
  const page = Number(request.nextUrl.searchParams.get("page") ?? 1);
  if (query.length < 2 || query.length > 120 || !Number.isInteger(page) || page < 1 || page > 50) return NextResponse.json({ error: "Enter 2–120 characters and a valid page." }, { status: 400, headers });
  if (!usdaConfigured()) return NextResponse.json({ error: "USDA food search is not configured yet. You can enter package-label values." }, { status: 503, headers });
  const { data: allowed, error } = await client.supabase.rpc("gym_consume_nutrition_request", { request_kind: "food" });
  if (error) return NextResponse.json({ error: "Food lookup is unavailable. Check the nutrition migration." }, { status: 503, headers });
  if (!allowed) return NextResponse.json({ error: "You’ve reached the food lookup limit. Try later or enter label values." }, { status: 429, headers });
  try { return NextResponse.json(await searchFoods(query, page), { headers }); }
  catch { return NextResponse.json({ error: "USDA food search is unavailable. Try again later or enter label values." }, { status: 503, headers }); }
}
