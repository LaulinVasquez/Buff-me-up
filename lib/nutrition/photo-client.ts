"use client";
export type PreparedMealPhoto={dataUrl:string;width:number;height:number;bytes:number};
export async function prepareMealPhoto(file:File):Promise<PreparedMealPhoto>{
 if(file.size>20_000_000)throw new Error("Choose a photo smaller than 20 MB.");
 const head=new Uint8Array(await file.slice(0,16).arrayBuffer());
 const ascii=(start:number,end:number)=>Array.from(head.slice(start,end)).map(c=>String.fromCharCode(c)).join("");
 const supported=(head[0]===0xff&&head[1]===0xd8&&head[2]===0xff)||(head[0]===137&&ascii(1,4)==="PNG")||(ascii(0,4)==="RIFF"&&ascii(8,12)==="WEBP")||(ascii(4,8)==="ftyp"&&["heic","heix","hevc","hevx","mif1","heif"].includes(ascii(8,12)));
 if(!supported)throw new Error("Choose a JPEG, PNG, WebP or a phone photo your browser can open.");
 let bitmap:ImageBitmap|null=null;let fallback:HTMLImageElement|null=null;let localUrl:string|null=null;
 try{
  try{bitmap=await createImageBitmap(file,{imageOrientation:"from-image",resizeWidth:1280,resizeQuality:"high"});}catch{localUrl=URL.createObjectURL(file);fallback=new Image();fallback.src=localUrl;await fallback.decode();}
  const source=bitmap??fallback!;const width=bitmap?.width??fallback!.naturalWidth,height=bitmap?.height??fallback!.naturalHeight;
  if(!width||!height||width*height>50_000_000||height/width>8||width/height>8)throw new Error("Choose a close-up meal photo rather than a panorama.");
  const ratio=Math.min(1,1280/Math.max(width,height));const canvas=document.createElement("canvas");canvas.width=Math.max(1,Math.round(width*ratio));canvas.height=Math.max(1,Math.round(height*ratio));
  const context=canvas.getContext("2d");if(!context)throw new Error("Photo preparation is unavailable. Try another browser or enter label values.");context.fillStyle="#ffffff";context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(source,0,0,canvas.width,canvas.height);
  const encode=(quality:number)=>new Promise<Blob>((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error("The photo could not be prepared.")),"image/jpeg",quality));
  let blob=await encode(0.82);if(blob.size>1_000_000)blob=await encode(0.6);if(blob.size>1_000_000)throw new Error("The photo is still too large. Choose a smaller photo.");
  const dataUrl=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>typeof reader.result==="string"?resolve(reader.result):reject(new Error("Photo preparation failed"));reader.onerror=()=>reject(new Error("Photo preparation failed"));reader.readAsDataURL(blob);});
  return {dataUrl,width:canvas.width,height:canvas.height,bytes:blob.size};
 }catch(error){throw new Error(error instanceof Error?error.message:"This photo format couldn’t be opened. Try a JPEG or another photo.");}
 finally{bitmap?.close();if(localUrl)URL.revokeObjectURL(localUrl);}
}
