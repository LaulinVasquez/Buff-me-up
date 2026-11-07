export type NutritionSaveError={reason:"conflict"|"setup"|"auth"|"validation"|"limit"|"unavailable";message:string};
export function mealSaveError(error:unknown):NutritionSaveError {
 const e=error&&typeof error==="object"?error as {code?:unknown;message?:unknown}:{};const message=typeof e.message==="string"?e.message:"";
 if(["PGRST202","PGRST204","42P01","42883"].includes(String(e.code)))return {reason:"setup",message:"Meal saving is unavailable because the nutrition setup is incomplete. Your draft is kept here. Verify nutrition migrations 14–16, then reload saved data and retry."};
 if(message.startsWith("Meal changed")||message.startsWith("Meal request changed"))return {reason:"conflict",message:"This meal was changed in another tab. Your draft is kept. Load the latest saved version and review your edits before retrying."};
 if(message==="Authentication required"||e.code==="PGRST301")return {reason:"auth",message:"Your session needs to be refreshed. Your draft is kept in this tab. Reload and sign in again if needed."};
 if(message.includes("more than 100"))return {reason:"limit",message:"Archive an existing meal before adding another. Your draft is kept in this tab."};
 if(message==="Invalid meal"||message==="Meal nutrition exceeds supported ranges"||e.code==="23514")return {reason:"validation",message:"The meal’s quantities or nutrition exceed supported ranges. Your draft is kept; review the ingredients and servings."};
 const reference=typeof e.code==="string"&&/^[A-Z0-9]{5,12}$/.test(e.code)?` Reference: ${e.code}.`:"";
 return {reason:"unavailable",message:`The meal couldn’t be saved. Your draft is kept in this tab. Retry, or reload saved data without losing your inputs.${reference}`};
}
