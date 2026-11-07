export const DRAFT_PREFIX = "bmu-nutrition-draft-v1:";
export const DRAFT_MAX_AGE = 24 * 60 * 60 * 1000;
export const DRAFT_MAX_LENGTH = 500000;
export type DraftStorage = Pick<Storage,"getItem"|"setItem"|"removeItem"|"key"|"length">;
export const draftKey = (owner:string,scope:string) => `${DRAFT_PREFIX}${encodeURIComponent(owner)}:${scope}`;
export function encodeDraft(owner:string,scope:string,value:unknown,now=Date.now()) {
  const raw=JSON.stringify({version:1,owner,scope,updatedAt:now,value});
  if(raw.length>DRAFT_MAX_LENGTH)throw new Error("Draft is too large");
  return raw;
}
export function decodeDraft<T>(raw:string|null,owner:string,scope:string,validate:(value:unknown)=>value is T,now=Date.now()):T|null {
  if(!raw||raw.length>DRAFT_MAX_LENGTH)return null;
  try{const saved=JSON.parse(raw);return saved.version===1&&saved.owner===owner&&saved.scope===scope&&typeof saved.updatedAt==="number"&&saved.updatedAt<=now+60000&&now-saved.updatedAt<DRAFT_MAX_AGE&&validate(saved.value)?saved.value:null;}catch{return null;}
}
export function clearOwnerDrafts(storage:DraftStorage,owner?:string,scope?:string) {
  const prefix=owner?draftKey(owner,scope??""):DRAFT_PREFIX;
  for(let index=storage.length-1;index>=0;index--){const key=storage.key(index);if(key?.startsWith(prefix))storage.removeItem(key);}
}
export const object=(value:unknown):value is Record<string,unknown>=>Boolean(value&&typeof value==="object"&&!Array.isArray(value));
export const shortString=(value:unknown,max=2500):value is string=>typeof value==="string"&&value.length<=max;
export const draftStep=(value:unknown)=>Number.isInteger(value)&&Number(value)>=0&&Number(value)<=2;
export type RetryToken={fingerprint:string;id:string}|null;
export function validRetryToken(value:unknown):value is RetryToken{return value===null||(object(value)&&shortString(value.fingerprint,100000)&&typeof value.id==="string"&&/^[0-9a-f-]{36}$/i.test(value.id));}
export function mergeSavedRecords<T extends {id:string;revision?:number}>(saved:T[],local:T[]) {
  const records=new Map(local.map(item=>[item.id,item]));
  for(const item of saved){const prior=records.get(item.id);if(!prior||(item.revision??0)>=(prior.revision??0))records.set(item.id,item);}
  return [...records.values()];
}
