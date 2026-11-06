import { NextResponse } from "next/server";
import { nutritionClient } from "@/lib/nutrition/service";
import { normalizeBarcode } from "@/lib/nutrition/product-photos";
import { getProductPhoto, productPhotosEnabled } from "@/lib/nutrition/product-photos-server";
const headers={"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"};
export async function GET(_request:Request,{params}:{params:Promise<{barcode:string}>}) {
  let client;try{client=await nutritionClient();}catch{return NextResponse.json({error:"Sign in to view product photos."},{status:401,headers});}
  const {barcode}=await params;const code=normalizeBarcode(barcode);
  if(!code)return NextResponse.json({error:"Choose a valid product barcode."},{status:400,headers});
  if(!productPhotosEnabled())return NextResponse.json({photo:null},{headers});
  const {data:allowed,error}=await client.supabase.rpc("gym_consume_nutrition_request",{request_kind:"food"});
  if(error||!allowed)return NextResponse.json({photo:null},{headers});
  try{return NextResponse.json({photo:await getProductPhoto(code)},{headers});}catch{return NextResponse.json({photo:null},{headers});}
}
