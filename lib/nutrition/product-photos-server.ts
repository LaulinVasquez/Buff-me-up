import "server-only";
import { unstable_cache } from "next/cache";
import { createProductPhotoClient } from "./product-photos";
export const productPhotosEnabled=()=>process.env.OPEN_FOOD_FACTS_PHOTOS_ENABLED==="true";
const lookup=createProductPhotoClient(fetch,process.env.OPEN_FOOD_FACTS_USER_AGENT||undefined);
export const getProductPhoto=unstable_cache(lookup,["off-exact-product-photo-v1"],{revalidate:86400});
