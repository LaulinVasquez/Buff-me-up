"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isAccentTheme, type AppearanceActionState } from "@/lib/appearance/themes";

export async function saveAppearanceAction(_previous: AppearanceActionState, form: FormData): Promise<AppearanceActionState> {
  const accentTheme = form.get("accentTheme");
  if (!isAccentTheme(accentTheme)) return { status: "error", message: "Choose one of the available accent colors." };
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { status: "error", message: "Please sign in again before saving your appearance." };
    const { data, error } = await supabase.from("gym_profiles").update({ accent_theme: accentTheme })
      .eq("id", user.id).select("accent_theme").single();
    if (error || !data) throw new Error("Appearance was not saved");
  } catch {
    return { status: "error", message: "We couldn’t confirm your color was saved. Try again or reload the page to check your saved theme." };
  }
  revalidatePath("/app", "layout");
  return { status: "success", message: "Appearance saved. This color follows your account on your other devices." };
}
