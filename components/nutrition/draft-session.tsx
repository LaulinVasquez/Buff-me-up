"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useSyncExternalStore, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { clearOwnerDrafts, decodeDraft, draftKey, encodeDraft } from "@/lib/nutrition/drafts";
const OwnerContext=createContext("");
const changeEvent="bmu-nutrition-drafts";
const savedEvent="bmu-nutrition-saved";
const savedKey="bmu-nutrition-change-v1";
const memory=new Map<string,string>();
const failed=new Set<string>();
const notify=()=>window.dispatchEvent(new Event(changeEvent));
export function publishNutritionChange(owner:string) {
  if(!owner)return;
  try{localStorage.setItem(savedKey,JSON.stringify({owner,id:crypto.randomUUID()}));}catch{}
  window.dispatchEvent(new CustomEvent(savedEvent,{detail:owner}));
}
export function NutritionDraftSession({owner,children,watchAuth=true}:{owner:string;children:ReactNode;watchAuth?:boolean}) {
  const router=useRouter();
  useEffect(()=>{
    let refreshTimer:ReturnType<typeof setTimeout>|undefined;
    const refresh=()=>{if(document.visibilityState!=="hidden"){clearTimeout(refreshTimer);refreshTimer=setTimeout(()=>router.refresh(),75);}};
    const storage=(event:StorageEvent)=>{if(event.key===savedKey){try{if(JSON.parse(event.newValue??"{}").owner===owner)refresh();}catch{}}};
    const saved=(event:Event)=>{if((event as CustomEvent).detail===owner)refresh();};
    window.addEventListener("focus",refresh);document.addEventListener("visibilitychange",refresh);window.addEventListener("storage",storage);window.addEventListener(savedEvent,saved);
    let unsubscribe:undefined|(()=>void);
    if(watchAuth){try{const {data}=createClient().auth.onAuthStateChange((event,session)=>{if(event==="SIGNED_OUT"||(session?.user?.id&&session.user.id!==owner)){try{clearOwnerDrafts(sessionStorage);}catch{}memory.clear();failed.clear();notify();setTimeout(()=>router.refresh(),0);}});unsubscribe=()=>data.subscription.unsubscribe();}catch{}}
    return ()=>{clearTimeout(refreshTimer);window.removeEventListener("focus",refresh);document.removeEventListener("visibilitychange",refresh);window.removeEventListener("storage",storage);window.removeEventListener(savedEvent,saved);unsubscribe?.();};
  },[owner,router,watchAuth]);
  return <OwnerContext.Provider value={owner}>{children}</OwnerContext.Provider>;
}
export const useNutritionOwner=()=>useContext(OwnerContext);
function subscribe(callback:()=>void){window.addEventListener(changeEvent,callback);return()=>window.removeEventListener(changeEvent,callback);}
export function discardNutritionDraft(owner:string,scope:string){try{clearOwnerDrafts(sessionStorage,owner,scope);}catch{}for(const key of memory.keys())if(key.startsWith(draftKey(owner,scope))){memory.delete(key);failed.delete(key);}notify();}
export function useNutritionDraft<T>(scope:string,initial:T,validate:(value:unknown)=>value is T) {
  const owner=useNutritionOwner();const key=draftKey(owner,scope);
  const read=useCallback(()=>{
    let raw=memory.get(key)??null;let available=false;
    if(owner){try{raw=failed.has(key)?raw:sessionStorage.getItem(key)??raw;available=!failed.has(key);}catch{}}
    const value=owner?decodeDraft(raw,owner,scope,validate):null;
    return `${available?"ok":"memory"}|${value===null?"":raw}`;
  },[key,owner,scope,validate]);
  const snapshot=useSyncExternalStore(subscribe,read,()=>"");
  const stored=useMemo(()=>{const raw=snapshot.slice(snapshot.indexOf("|")+1);return raw?decodeDraft(raw,owner,scope,validate):null;},[snapshot,owner,scope,validate]);
  const value=stored??initial;
  const update:Dispatch<SetStateAction<T>>=next=>{
    const currentRaw=read().split("|").slice(1).join("|");const current=decodeDraft(currentRaw,owner,scope,validate)??initial;
    const result=typeof next==="function"?(next as (previous:T)=>T)(current):next;
    if(!owner)return;
    try{const raw=encodeDraft(owner,scope,result);memory.set(key,raw);try{sessionStorage.setItem(key,raw);failed.delete(key);}catch{failed.add(key);}notify();}catch{memory.set(key,encodeDraft(owner,scope,current));notify();}
  };
  const clear=()=>discardNutritionDraft(owner,scope);
  return [value,update,clear,{ready:snapshot!=="",available:snapshot.startsWith("ok|"),hasDraft:snapshot.includes("|")&&snapshot.slice(snapshot.indexOf("|")+1)!==""}] as const;
}
export function DraftStatus({available,ready}:{available:boolean;ready:boolean}){return <p role="status" className={`mt-3 text-xs leading-5 ${available?"text-slate-400":"text-amber-200"}`}>{!ready?"Loading your unfinished work…":available?"Unfinished changes stay in this tab when you reload, for up to 24 hours.":"Browser draft storage is unavailable. Keep this tab open; reloading may lose unfinished changes."}</p>;}

export function clearNutritionSession(){try{clearOwnerDrafts(sessionStorage);}catch{}memory.clear();failed.clear();notify();}
