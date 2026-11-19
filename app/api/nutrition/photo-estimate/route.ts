import { nutritionClient } from "@/lib/nutrition/service";
import { normalizeMealPhoto } from "@/lib/nutrition/photo-image";
import { estimateMealPhoto } from "@/lib/nutrition/photo-agent";
import { photoRequest } from "@/lib/nutrition/photo-http";
export const runtime="nodejs";
export const maxDuration=40;
const configured=()=>Boolean(process.env.OPENAI_API_KEY&&process.env.OPENAI_NUTRITION_PHOTO_MODEL);
const handle=(request:Request)=>photoRequest(request,{
 configured,normalize:normalizeMealPhoto,
 authenticate:async()=>{const {supabase}=await nutritionClient();return {consume:async()=>{const {data,error}=await supabase.rpc("gym_consume_nutrition_request",{request_kind:"photo"});if(error)throw new Error("Photo quota unavailable");return data===true;}};},
 analyze:(image,context)=>estimateMealPhoto({image,context,key:process.env.OPENAI_API_KEY??"",model:process.env.OPENAI_NUTRITION_PHOTO_MODEL??""}),
});
export const GET=handle;
export const POST=handle;
