"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isWeeklyGoal, type GoalState } from "@/lib/progress/review";
export async function saveGoalAction(_previous:GoalState,form:FormData):Promise<GoalState>{
 const goal=Number(form.get("goal"));if(!isWeeklyGoal(goal))return {status:"error",message:"Choose a goal from 1 to 7 days."};
 try{const supabase=await createClient();const {data:{user},error:authError}=await supabase.auth.getUser();if(authError||!user)throw new Error("Sign in required");const {data,error}=await supabase.from("gym_profiles").update({weekly_goal:goal}).eq("id",user.id).select("weekly_goal").single();if(error||!data)throw new Error("Goal not saved");}
 catch{return {status:"error",message:"Your goal was not saved. Please try again or reload to check the saved goal."};}
 revalidatePath("/app","layout");return {status:"success",message:"Weekly goal saved. You can adjust it whenever your schedule changes."};
}
