export type ProductPhoto = {imageUrl:string;productUrl:string;title:string;creator:string;licenseUrl:string};
export function normalizeBarcode(value: unknown): string | null {
  if(typeof value!=="string"||!/^(?:\d{8}|\d{12,14})$/.test(value)||!/[1-9]/.test(value))return null;
  const digits=[...value].map(Number);const check=digits.pop()!;
  const sum=digits.reverse().reduce((total,digit,index)=>total+digit*(index%2===0?3:1),0);
  if((10-sum%10)%10!==check)return null;
  const trimmed=value.replace(/^0+/,"");
  return trimmed.length<=8?trimmed.padStart(8,"0"):trimmed.length<=13?trimmed.padStart(13,"0"):trimmed;
}
const record=(value:unknown):Record<string,unknown>=>value&&typeof value==="object"&&!Array.isArray(value)?value as Record<string,unknown>:{};
function safeImage(value:unknown):string|null {
  if(typeof value!=="string"||value.length>1000)return null;
  try {const url=new URL(value);return url.protocol==="https:"&&url.hostname==="images.openfoodfacts.org"&&!url.port&&!url.username&&!url.password&&!url.search&&!url.hash&&url.pathname.startsWith("/images/products/")&&/\.jpg$/i.test(url.pathname)?url.href:null;}catch{return null;}
}
export function adaptProductPhoto(payload:unknown,barcode:string):ProductPhoto|null {
  const expected=normalizeBarcode(barcode);const result=record(payload);const product=record(result.product);
  if(!expected||normalizeBarcode(product.code??result.code)!==expected)return null;
  const front=record(record(product.selected_images).front);const display=record(front.display);const small=record(front.small);
  const language=typeof product.lang==="string"?product.lang:"en";
  const choices=[...Object.entries(display),...Object.entries(small)].sort(([a],[b])=>(a==="en"?-2:a===language?-1:0)-(b==="en"?-2:b===language?-1:0));
  for(const [lang,candidate]of choices){const imageUrl=safeImage(candidate);if(!imageUrl)continue;
    const images=record(product.images);const selected=record(images[`front_${lang}`]);const original=record(images[String(selected.imgid)]);
    return {imageUrl,productUrl:`https://world.openfoodfacts.org/product/${expected}`,title:typeof product.product_name==="string"?product.product_name.slice(0,200):`Product ${expected}`,creator:typeof original.uploader==="string"?original.uploader.slice(0,100):"Open Food Facts contributors",licenseUrl:"https://creativecommons.org/licenses/by-sa/3.0/"};
  }
  return null;
}
export function createProductPhotoClient(fetcher:typeof fetch=fetch,userAgent="BuffMeUp/0.1 (https://github.com/LaulinVasquez/Buff-me-up)") {
  let minute=-1,used=0;
  return async(barcode:string):Promise<ProductPhoto|null>=>{
    const code=normalizeBarcode(barcode);if(!code)return null;
    const now=Math.floor(Date.now()/60000);if(now!==minute){minute=now;used=0;}if(used>=12)throw new Error("Photo lookup is busy");used++;
    const url=new URL(`https://world.openfoodfacts.org/api/v3.6/product/${code}.json`);
    url.searchParams.set("fields","code,product_name,lang,selected_images,images");
    const response=await fetcher(url,{headers:{"User-Agent":userAgent,"Accept":"application/json"},signal:AbortSignal.timeout(3500),redirect:"error"});
    if(response.status===404)return null;
    if(!response.ok)throw new Error("Product photo unavailable");
    return adaptProductPhoto(await response.json(),code);
  };
}
