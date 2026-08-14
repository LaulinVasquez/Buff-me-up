import { createClient } from "@/lib/supabase/server";

export async function getAuthenticatedWorkoutClient() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (typeof userId !== "string") throw new Error("Authentication required");
  return { supabase, userId };
}

export function assertNoError(error: { message: string } | null, fallback: string): asserts error is null {
  if (error) throw new Error(fallback, { cause: error });
}
