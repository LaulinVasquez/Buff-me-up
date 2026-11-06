"use client";
import Image from "next/image";
import { useEffect, useState } from "react";
import type { ProductPhoto as Photo } from "@/lib/nutrition/product-photos";
export function ProductPhoto({barcode}:{barcode:string|null|undefined}) {
  const [photo,setPhoto]=useState<Photo|null>(null);const [loading,setLoading]=useState(Boolean(barcode));const [broken,setBroken]=useState(false);
  useEffect(()=>{
    if(!barcode)return;
    const controller=new AbortController();
    fetch(`/api/nutrition/product-photo/${encodeURIComponent(barcode)}`,{signal:controller.signal}).then(async response=>response.ok?response.json():{photo:null}).then(payload=>{if(!controller.signal.aborted){setPhoto(payload.photo??null);setLoading(false);}}).catch(()=>{if(!controller.signal.aborted)setLoading(false);});
    return ()=>controller.abort();
  },[barcode]);
  return <div className="mt-4 rounded-2xl border border-slate-700 p-3">
    {photo&&!broken?<><div className="rounded-xl bg-white p-3"><Image src={photo.imageUrl} alt={`Package photo: ${photo.title}`} width={240} height={240} unoptimized loading="lazy" referrerPolicy="no-referrer" onError={()=>setBroken(true)} className="mx-auto h-40 w-full object-contain"/></div><p className="mt-2 text-xs leading-5 text-slate-400"><a className="text-accent-300 underline" href={photo.productUrl} target="_blank" rel="noreferrer">Photo: {photo.creator} / Open Food Facts</a> · <a className="underline" href={photo.licenseUrl} target="_blank" rel="noreferrer">CC BY-SA 3.0</a></p><p className="mt-1 text-xs text-slate-400">Matched by barcode. Check your current package.</p></>:<p className="text-xs leading-5 text-slate-400" role={loading?"status":undefined}>{loading?"Looking for a product photo…":"Product photo unavailable. You can still add this food."}</p>}
    {barcode?<p className="mt-2 break-all text-xs text-slate-400">Barcode {barcode}</p>:null}
  </div>;
}
