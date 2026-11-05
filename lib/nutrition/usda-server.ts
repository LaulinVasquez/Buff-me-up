import "server-only";
import { unstable_cache } from "next/cache";
import { createUsdaClient } from "./usda";
export const usdaConfigured = () => Boolean(process.env.USDA_FDC_API_KEY);
const client = () => createUsdaClient(process.env.USDA_FDC_API_KEY ?? "");
export const searchFoods = unstable_cache(async (query: string, page: number) => client().search(query, page), ["usda-food-search-v2"], { revalidate: 86400 });
export const getFoodDetails = unstable_cache(async (id: number) => client().details(id), ["usda-food-details-v2"], { revalidate: 604800 });
