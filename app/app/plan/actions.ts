"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createPlanFromRecommendation } from "@/lib/workouts/plans";

export async function adoptRecommendedPlan(formData: FormData) {
  const recommendationId = formData.get("recommendationId");
  if (typeof recommendationId !== "string") redirect("/app/plan?error=invalid_plan");
  try {
    await createPlanFromRecommendation(recommendationId);
  } catch {
    redirect("/app/plan?error=adoption_failed");
  }
  revalidatePath("/app");
  redirect("/app/plan?created=true");
}
