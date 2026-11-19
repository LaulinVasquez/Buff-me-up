import { PHOTO_CONSENT_VERSION, PHOTO_MAX_BODY_BYTES, PHOTO_MAX_UPLOAD_BYTES, validPhotoAnalysis, type PhotoAnalysis } from "./photo-estimates";
export const PHOTO_HEADERS={"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff","Vary":"Cookie"};
type Client={consume:()=>Promise<boolean>};
export type PhotoDependencies={authenticate:()=>Promise<Client>;configured:()=>boolean;normalize:(bytes:Uint8Array)=>Promise<string>;analyze:(image:string,context:string)=>Promise<PhotoAnalysis>};
const json=(data:unknown,status=200)=>Response.json(data,{status,headers:PHOTO_HEADERS});
export async function photoRequest(request:Request,deps:PhotoDependencies):Promise<Response>{
 let client:Client;try{client=await deps.authenticate();}catch{return json({error:"Sign in to estimate a meal photo."},401);}
 if(request.method==="GET")return json({available:deps.configured()});
 if(request.method!=="POST")return json({error:"Unsupported request."},405);
 const origin=request.headers.get("origin");if(origin&&origin!==new URL(request.url).origin)return json({error:"Open this feature from Buff Me Up."},403);
 if(!deps.configured())return json({error:"Photo estimates are unavailable right now. You can still search foods or enter label values."},503);
 if(request.headers.get("content-type")?.split(";")[0].trim().toLowerCase()!=="application/json")return json({error:"Choose a photo and try again."},415);
 const declared=Number(request.headers.get("content-length")??0);if(!Number.isFinite(declared)||declared<0||declared>PHOTO_MAX_BODY_BYTES)return json({error:"The photo is too large. Choose a smaller photo."},413);
 const reader=request.body?.getReader();if(!reader)return json({error:"Choose a photo first."},400);
 let raw="",size=0;const decoder=new TextDecoder();
 try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>PHOTO_MAX_BODY_BYTES){await reader.cancel();return json({error:"The photo is too large. Choose a smaller photo."},413);}raw+=decoder.decode(value,{stream:true});}raw+=decoder.decode();}catch{return json({error:"The photo upload was interrupted. Choose the photo again."},400);}finally{reader.releaseLock();}
 let payload:{image?:unknown;context?:unknown;consent?:unknown};
 try{payload=JSON.parse(raw);if(!payload||typeof payload!=="object"||Array.isArray(payload)||Object.keys(payload).sort().join()!=="consent,context,image")throw new Error();}catch{return json({error:"Choose the photo again and review sharing consent."},400);}
 if(payload.consent!==PHOTO_CONSENT_VERSION)return json({error:"Choose to share this photo with OpenAI before analyzing it."},400);
 if(typeof payload.context!=="string"||payload.context.length>300||typeof payload.image!=="string"||payload.image.length>Math.ceil(PHOTO_MAX_UPLOAD_BYTES/3)*4||!payload.image.length||(payload.image.length%4!==0||!/^[A-Za-z0-9+/]+={0,2}$/.test(payload.image)))return json({error:"Choose a supported photo and keep portion notes under 300 characters."},400);
 const bytes=Buffer.from(payload.image,"base64");if(bytes.toString("base64")!==payload.image)return json({error:"The photo could not be read. Choose it again."},400);
 let image:string;try{image=await deps.normalize(bytes);}catch{return json({error:"The photo could not be opened. Try a smaller JPEG or take another photo."},400);}
 try{if(!await client.consume())return json({error:"You’ve reached today’s five photo estimates. Search foods or enter label values instead."},429);}catch{return json({error:"Photo estimates need the server setup to be updated. Your meal draft is kept."},503);}
 try{const analysis=await deps.analyze(image,payload.context.trim());if(!validPhotoAnalysis(analysis))throw new Error("Invalid estimate");return json({analysis});}
 catch{return json({error:"The photo estimate couldn’t complete. Your meal draft is kept. Try a clearer photo or enter label values. Interrupted attempts can still count toward today’s limit."},502);}
}
