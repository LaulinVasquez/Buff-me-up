import { NextResponse } from "next/server";
import { nutritionClient } from "@/lib/nutrition/service";
import { getFoodDetails, usdaConfigured } from "@/lib/nutrition/usda-server";
const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };
export async function GET(_request: Request, { params }: { params: Promise<{ foodId: string }> }) {
  let client;
  try { client = await nutritionClient(); } catch { return NextResponse.json({ error: "Sign in to look up a food." }, { status: 401, headers }); }
  const { foodId } = await params; const id = Number(foodId);
  if (!/^\d+$/.test(foodId) || !Number.isSafeInteger(id) || id <= 0) return NextResponse.json({ error: "Choose a valid food." }, { status: 400, headers });
  if (!usdaConfigured()) return NextResponse.json({ error: "USDA food lookup is not configured. Enter label values." }, { status: 503, headers });
  const { data: allowed, error } = await client.supabase.rpc("gym_consume_nutrition_request", { request_kind: "food" });
  if (error || !allowed) return NextResponse.json({ error: error ? "Food lookup is unavailable. Check the nutrition migration." : "Food lookup limit reached. Try again later." }, { status: error ? 503 : 429, headers });
  try { return NextResponse.json(await getFoodDetails(id), { headers }); }
  catch { return NextResponse.json({ error: "Food details couldn’t load. Try another food or enter label values." }, { status: 503, headers }); }
}
