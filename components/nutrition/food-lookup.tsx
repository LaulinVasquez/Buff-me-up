"use client";
import { useEffect, useRef, useState } from "react";
import type { FoodIngredient } from "@/lib/nutrition/types";
import type { FoodMatch, UsdaFoodDetails } from "@/lib/nutrition/usda";
import { scaleNutrients, validNutrients } from "@/lib/nutrition/meals";

export function FoodLookup({ onAdd }: { onAdd: (item: FoodIngredient, packageIngredients: string | null) => string | null }) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [foods, setFoods] = useState<FoodMatch[]>([]);
  const [selected, setSelected] = useState<UsdaFoodDetails | null>(null);
  const [grams, setGrams] = useState("100");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);

  const search = async (next = 1) => {
    controller.current?.abort();
    const current = new AbortController(); controller.current = current;
    setPending(true); setMessage(""); setFoods([]); setSelected(null);
    try {
      const response = await fetch(`/api/nutrition/foods?${new URLSearchParams({ q: query, page: String(next) })}`, { signal: current.signal });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Food search failed.");
      if (!Array.isArray(payload.foods)) throw new Error("Food search returned an unexpected response.");
      if (current.signal.aborted) return;
      setFoods(payload.foods); setPage(payload.page); setTotalPages(payload.totalPages);
      if (!payload.foods.length) setMessage("No foods found. Try a brand or a more specific food name, or use ‘Enter an ingredient manually’ below.");
    } catch (error) {
      if (!current.signal.aborted) setMessage(error instanceof Error ? error.message : "Food search couldn’t load. You can enter an ingredient manually below.");
    } finally { if (!current.signal.aborted) setPending(false); }
  };

  const select = async (food: FoodMatch) => {
    controller.current?.abort();
    const current = new AbortController(); controller.current = current;
    setPending(true); setMessage(""); setSelected(null);
    try {
      const response = await fetch(`/api/nutrition/foods/${food.id}`, { signal: current.signal });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Food details couldn’t load.");
      if (payload.ingredient?.fdc_id !== food.id || payload.ingredient.source !== "usda" || !validNutrients(payload.ingredient.per100g)) throw new Error("Food details returned an unexpected response. Try again or enter the item manually.");
      if (current.signal.aborted) return;
      setSelected(payload as UsdaFoodDetails); setGrams("100");
    } catch (error) {
      if (!current.signal.aborted) setMessage(error instanceof Error ? error.message : "Food details couldn’t load.");
    } finally { if (!current.signal.aborted) setPending(false); }
  };

  const amount = Number(grams);
  const validAmount = grams.trim() !== "" && Number.isFinite(amount) && amount >= 0.001 && amount <= 10000;
  const nutrition = selected && validAmount ? scaleNutrients(selected.ingredient.per100g, amount / 100) : null;
  return <div className="rounded-2xl border border-slate-700 p-4">
    <label className="block text-sm font-semibold" htmlFor="usda-food-search">Search foods and products</label>
    <div className="mt-2 flex flex-wrap gap-2">
      <input id="usda-food-search" className="min-h-12 min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-950 px-3 text-base" value={query} maxLength={120}
        onChange={event => { controller.current?.abort(); setPending(false); setQuery(event.target.value); setFoods([]); setSelected(null); setMessage(""); setTotalPages(0); }}
        placeholder="Oats, cooked rice, a product or brand…"
        onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); if (query.trim().length >= 2) void search(); } }} />
      <button type="button" className="min-h-12 rounded-xl bg-slate-800 px-4 font-semibold disabled:opacity-40" disabled={pending || query.trim().length < 2} onClick={() => void search()}>Search foods</button>
    </div>
    <p className="mt-2 text-xs leading-5 text-slate-400">Find the exact brand and cooked/raw form. Add the grams used in your whole recipe; we calculate each serving automatically.</p>
    {pending ? <p role="status" className="mt-3 text-sm text-slate-400">Loading food data…</p> : null}
    {message ? <p role="status" className="mt-3 text-sm text-amber-200">{message}</p> : null}
    {selected ? <div className="mt-4 rounded-xl border border-accent-400/30 bg-slate-950 p-4">
      <h3 className="break-words text-base font-bold">{selected.ingredient.name}</h3>
      <p className="mt-1 text-xs text-slate-400">USDA FoodData Central · food {selected.ingredient.fdc_id} · nutrients per 100 g</p>
      <label className="mt-4 block text-sm font-semibold">Amount in your whole recipe (grams)
        <input className="mt-2 min-h-12 w-full min-w-0 rounded-xl border border-slate-700 bg-slate-900 px-3 text-base" type="number" inputMode="decimal" min={0.001} max={10000} step="0.001" value={grams} onChange={event => setGrams(event.target.value)} />
      </label>
      {selected.servingGrams !== null ? <button type="button" className="mt-2 min-h-11 text-left text-sm text-accent-300 underline" onClick={() => setGrams(String(selected.servingGrams))}>Use one label serving ({selected.servingGrams} g)</button> : <p className="mt-2 text-xs leading-5 text-slate-400">No gram serving is supplied. Weigh the amount used; cups and milliliters aren’t automatically converted to grams.</p>}
      {nutrition ? <p className="mt-3 text-sm">For {amount} g: {nutrition.calories === null ? "Calories unknown" : `${nutrition.calories} kcal`} · {nutrition.protein === null ? "Protein unknown" : `${nutrition.protein} g protein`}</p> : <p className="mt-3 text-sm text-amber-200">Enter between 0.001 and 10,000 grams.</p>}
      {selected.packageIngredients ? <details className="mt-3"><summary className="min-h-9 cursor-pointer text-sm font-semibold text-accent-300">Package ingredients · copied when added</summary><p className="mt-2 max-h-48 overflow-y-auto break-words text-xs leading-5 text-slate-300">{selected.packageIngredients}</p></details> : <p className="mt-3 text-xs leading-5 text-slate-400">This record has no package ingredient list. Add any missing ingredients to your meal notes and check the current label.</p>}
      <p className="mt-2 text-xs leading-5 text-slate-400">Review current package ingredients and allergen tags before using this meal in a plan.</p>
      <div className="mt-4 flex flex-wrap gap-3">
        <button type="button" className="min-h-12 rounded-xl bg-accent-400 px-4 font-bold text-slate-950 disabled:opacity-40" disabled={!validAmount || pending} onClick={() => {
          if (!validAmount) return;
          const error = onAdd({ ...selected.ingredient, grams: amount }, selected.packageIngredients);
          if (error) { setMessage(error); return; }
          setMessage(`${selected.ingredient.name} added (${amount} g). Search for another item or review your meal below.`); setSelected(null); setFoods([]); setTotalPages(0);
        }}>Add to meal</button>
        <button type="button" className="min-h-12 rounded-xl border border-slate-700 px-4 text-sm" onClick={() => { setSelected(null); setMessage(""); }}>Back to results</button>
      </div>
    </div> : <>
      <ul className="mt-3 space-y-2">{foods.map(food => <li key={food.id}><button type="button" disabled={pending} onClick={() => void select(food)} className="w-full rounded-xl border border-slate-700 p-3 text-left text-sm disabled:opacity-40"><strong className="block break-words">{food.name}</strong><span className="mt-1 block text-xs text-slate-400">{food.brand ?? food.dataType ?? "USDA food"} · Choose amount</span></button></li>)}</ul>
      {foods.length > 0 && totalPages > 1 ? <div className="mt-3 flex gap-3"><button type="button" className="min-h-11 rounded-lg border border-slate-700 px-3 text-sm disabled:opacity-40" disabled={pending || page <= 1} onClick={() => void search(page - 1)}>Previous foods</button><button type="button" className="min-h-11 rounded-lg border border-slate-700 px-3 text-sm disabled:opacity-40" disabled={pending || page >= totalPages} onClick={() => void search(page + 1)}>More foods</button></div> : null}
    </>}
    <a className="mt-3 inline-block text-xs text-slate-400 underline" href="https://fdc.nal.usda.gov/" target="_blank" rel="noreferrer">Source: USDA FoodData Central</a>
  </div>;
}
