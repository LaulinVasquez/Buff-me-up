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
  const searchInput = useRef<HTMLInputElement | null>(null);
  const amountInput = useRef<HTMLInputElement | null>(null);
  const resultButtons = useRef(new Map<number, HTMLButtonElement>());
  useEffect(() => { if (selected && !pending) amountInput.current?.focus(); }, [selected, pending]);
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
  const changeQuery = (value: string) => {
    controller.current?.abort(); setPending(false); setQuery(value); setFoods([]); setSelected(null); setMessage(""); setTotalPages(0); setPage(1);
  };
  return <section className="min-w-0 rounded-3xl border border-slate-700/80 bg-slate-950/50 p-3 sm:p-5" aria-label="Food catalog">
    <div className="mb-4 flex items-center gap-3">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-accent-400/10 text-accent-300"><FoodIcon kind="food" /></span>
      <div className="min-w-0"><label className="block text-base font-bold" htmlFor="usda-food-search">Search foods and products</label><p className="mt-0.5 text-xs text-slate-400">Find what goes into your meal.</p></div>
    </div>
    <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
      <div className="relative min-w-0">
        <input ref={searchInput} id="usda-food-search" aria-describedby="usda-food-help" className="min-h-12 w-full min-w-0 rounded-xl border border-slate-700 bg-slate-900 py-3 pl-3 pr-12 text-base outline-none focus:border-accent-400 focus:ring-2 focus:ring-accent-400/20" value={query} maxLength={120}
          onChange={event => changeQuery(event.target.value)} placeholder="Food or brand…"
          onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); if (!pending && query.trim().length >= 2) void search(); } }} />
        {query ? <button type="button" aria-label="Clear food search" className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-xl text-slate-400 hover:text-white focus-visible:outline-2 focus-visible:outline-accent-400" onClick={() => { changeQuery(""); searchInput.current?.focus(); }}><FoodIcon kind="clear" /></button> : null}
      </div>
      <button type="button" aria-label="Search foods" className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-accent-400 px-3 font-bold text-slate-950 hover:bg-accent-300 disabled:opacity-40 sm:px-4" disabled={pending || query.trim().length < 2} onClick={() => void search()}><FoodIcon kind="search" /><span className="hidden sm:inline">Search</span></button>
    </div>
    <p id="usda-food-help" className="mt-3 text-xs leading-5 text-slate-400">Match the brand and cooked/raw form. Nutrition previews are per 100 g.</p>
    {message ? <p role="status" className="mt-4 rounded-xl border border-slate-700 bg-slate-900 p-3 text-sm leading-6 text-slate-200">{message}</p> : null}
    {pending ? <div className="mt-4" role="status"><span className="text-sm text-slate-400">Loading food data…</span><div aria-hidden="true" className="mt-3 grid gap-3 md:grid-cols-2">{[0,1].map(item => <div key={item} className="h-36 animate-pulse rounded-2xl border border-slate-800 bg-slate-900 motion-reduce:animate-none" />)}</div></div> : null}
    {selected && !pending ? <article className="mt-4 overflow-hidden rounded-2xl border border-accent-400/30 bg-slate-900/80">
      <div className="border-b border-slate-700/70 p-3 sm:p-5">
        <button type="button" className="mb-3 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-slate-300 hover:text-accent-300" onClick={() => { const id=selected.ingredient.fdc_id; setSelected(null); setMessage(""); requestAnimationFrame(() => { if(id !== null) resultButtons.current.get(id)?.focus(); }); }}><FoodIcon kind="back" />Back to results</button>
        <div className="flex items-start gap-3"><span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-accent-400/10 text-accent-300"><FoodIcon kind={selected.brand ? "package" : "food"} /></span><div className="min-w-0"><p className="text-xs font-semibold text-accent-300">Selected ingredient</p><h3 className="mt-1 break-words text-base font-bold leading-6 sm:text-lg">{selected.ingredient.name}</h3><p className="mt-1 text-xs text-slate-400">USDA food {selected.ingredient.fdc_id}</p></div></div>
      </div>
      <div className="grid gap-5 p-3 sm:p-5 lg:grid-cols-2">
        <div className="min-w-0">
          <label className="block text-sm font-semibold" htmlFor="usda-ingredient-grams">Amount in your whole recipe (grams)</label>
          <div className="relative mt-2"><input ref={amountInput} id="usda-ingredient-grams" aria-invalid={!validAmount} aria-describedby="usda-amount-help" className="min-h-14 w-full min-w-0 rounded-xl border border-slate-600 bg-slate-950 py-3 pl-4 pr-12 text-xl font-bold outline-none focus:border-accent-400 focus:ring-2 focus:ring-accent-400/20" type="number" inputMode="decimal" min={0.001} max={10000} step="0.001" value={grams} onChange={event => setGrams(event.target.value)} /><span aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm text-slate-400">g</span></div>
          {selected.servingGrams !== null ? <button type="button" className="mt-3 min-h-11 rounded-xl border border-slate-600 px-3 text-left text-xs font-semibold text-accent-300 hover:border-accent-400" onClick={() => setGrams(String(selected.servingGrams))}>Use one label serving ({selected.servingGrams} g)</button> : null}
          <p id="usda-amount-help" className={`mt-3 text-xs leading-5 ${validAmount ? "text-slate-400" : "text-amber-200"}`}>{!validAmount ? "Enter between 0.001 and 10,000 grams." : selected.servingGrams === null ? "Weigh your amount. Cups and milliliters aren’t automatically converted to grams." : "Enter all the grams used in your recipe. Recipe servings divide the total."}</p>
        </div>
        <div className="min-w-0 rounded-2xl bg-slate-950 p-3 sm:p-4" aria-live="polite" aria-atomic="true">
          <p className="text-xs font-semibold text-slate-400">{validAmount ? `Nutrition for ${amount} g` : "Nutrition preview"}</p>
          <p className="mt-2 break-words text-3xl font-black tracking-tight text-accent-300">{nutrition?.calories == null ? <span className="text-xl text-slate-300">Calories unknown</span> : <>{nutrition.calories}<span className="ml-2 text-sm font-medium tracking-normal text-slate-400">kcal</span></>}</p>
          <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-slate-800 pt-3">{([['Protein',nutrition?.protein],['Carbs',nutrition?.carbs],['Fat',nutrition?.fat]] as const).map(([label,value]) => <div key={label} className="min-w-0"><dt className="text-xs text-slate-400">{label}</dt><dd className="mt-1 break-words text-xs font-bold text-slate-100">{value == null ? "Unknown" : `${value} g`}</dd></div>)}</dl>
        </div>
      </div>
      <div className="px-3 pb-3 sm:px-5 sm:pb-5">
        {selected.packageIngredients ? <details open className="rounded-xl border border-slate-700 p-3"><summary className="min-h-9 cursor-pointer text-sm font-semibold text-slate-100">Package ingredients</summary><p className="mt-2 max-h-48 overflow-y-auto whitespace-pre-wrap break-words text-sm leading-6 text-slate-300">{selected.packageIngredients}</p><p className="mt-3 text-xs leading-5 text-slate-400">Copied to your meal notes when you add this item.</p></details> : <p className="rounded-xl border border-dashed border-slate-700 p-3 text-xs leading-5 text-slate-400">No package ingredient list supplied. Add missing details to your meal notes and check the current label.</p>}
        <button type="button" className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-accent-400 px-4 font-bold text-slate-950 hover:bg-accent-300 disabled:opacity-40" disabled={!validAmount || pending} onClick={() => {
          if (!validAmount) return;
          const error = onAdd({ ...selected.ingredient, grams: amount }, selected.packageIngredients);
          if (error) { setMessage(error); return; }
          setMessage(`${selected.ingredient.name} added (${amount} g). Search for another item or review your meal below.`); setSelected(null); setFoods([]); setTotalPages(0);
        }}>Add to meal<FoodIcon kind="arrow" /></button>
        <p className="mt-3 text-xs leading-5 text-slate-400">Check current ingredients and allergen tags before using this meal in a plan.</p>
      </div>
    </article> : !pending && foods.length > 0 ? <>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-2"><p role="status" className="text-sm font-semibold">{foods.length} {foods.length === 1 ? "result" : "results"} on this page</p><span className="text-xs text-slate-400">Per 100 g · choose to review</span></div>
      <ul className="mt-3 grid gap-3 md:grid-cols-2">{foods.map(food => <li className="min-w-0" key={food.id}>
        <button ref={node => { if(node) resultButtons.current.set(food.id,node); else resultButtons.current.delete(food.id); }} type="button" onClick={() => void select(food)} className="group flex h-full w-full min-w-0 flex-col rounded-2xl border border-slate-700 bg-slate-900/70 p-3 text-left transition-colors hover:border-accent-400/70 hover:bg-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-400 sm:p-4">
          <span className="flex w-full min-w-0 items-start gap-3 pb-4"><span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-slate-800 text-slate-400 group-hover:text-accent-300"><FoodIcon kind={food.brand || food.dataType === "Branded" ? "package" : "food"} /></span><span className="min-w-0 flex-1"><span className="inline-block rounded-md bg-slate-800 px-2 py-1 text-[10px] font-semibold leading-4 text-slate-300">{food.brand || food.dataType === "Branded" ? "Branded product" : "USDA food"}</span><strong className="mt-2 block break-words text-sm leading-6">{food.name}</strong><span className="mt-1 block break-words text-xs leading-5 text-slate-400">{food.brand || "USDA FoodData Central"}</span></span></span>
          <span className="mt-auto flex w-full flex-wrap items-center gap-2 border-t border-slate-700/70 pt-3"><span className="rounded-lg bg-slate-950 px-2 py-1.5 text-xs font-semibold text-accent-300">{food.nutrients?.calories == null ? "Calories unknown" : `${food.nutrients.calories} kcal`}</span><span className="rounded-lg bg-slate-950 px-2 py-1.5 text-xs text-slate-300">{food.nutrients?.protein == null ? "Protein unknown" : `${food.nutrients.protein} g protein`}</span><span className="ml-auto flex min-h-8 items-center gap-1 text-xs font-semibold text-slate-300">Choose<FoodIcon kind="arrow" /></span></span>
        </button>
      </li>)}</ul>
      {totalPages > 1 ? <nav aria-label="Food result pages" className="mt-4 flex flex-wrap items-center justify-between gap-2"><button type="button" className="min-h-11 rounded-xl border border-slate-700 px-3 text-sm disabled:opacity-40" disabled={page <= 1} onClick={() => void search(page - 1)}>Previous foods</button><span className="text-xs text-slate-400">Page {page} of {totalPages}</span><button type="button" className="min-h-11 rounded-xl border border-slate-700 px-3 text-sm disabled:opacity-40" disabled={page >= totalPages} onClick={() => void search(page + 1)}>More foods</button></nav> : null}
    </> : !pending && !message ? <div className="mt-4 rounded-2xl border border-dashed border-slate-700 p-4 text-center"><p className="text-sm font-semibold text-slate-300">What’s in your meal?</p><p className="mt-2 text-xs leading-5 text-slate-400">Search for foods such as oats or cooked rice, or enter the brand on your package.</p></div> : null}
    <a className="mt-4 inline-flex min-h-9 items-center text-xs text-slate-400 underline underline-offset-4" href="https://fdc.nal.usda.gov/" target="_blank" rel="noreferrer">Food data from USDA FoodData Central</a>
  </section>;
}

type FoodIconKind = "food" | "package" | "search" | "clear" | "arrow" | "back";
function FoodIcon({ kind }: { kind: FoodIconKind }) {
  const paths: Record<FoodIconKind, string> = {
    food: "M3 11h18M4 11a8 8 0 0 0 16 0M8 3v3m4-3v3m4-3v3M8 21h8",
    package: "m12 3 9 5-9 5-9-5 9-5Zm9 5v9l-9 5-9-5V8m9 5v9M7.5 5.5l9 5",
    search: "m21 21-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z",
    clear: "m6 6 12 12M6 18 18 6",
    arrow: "M4 12h16m-6-6 6 6-6 6",
    back: "M20 12H4m6-6-6 6 6 6",
  };
  return <svg className="size-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><path d={paths[kind]} /></svg>;
}
