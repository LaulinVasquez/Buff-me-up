"use client";

import { useActionState, useEffect } from "react";
import { useAppearance } from "./theme-provider";
import { ACCENT_THEMES, accentPalette, type AppearanceActionState } from "@/lib/appearance/themes";

type Props = Readonly<{ action: (previous: AppearanceActionState, form: FormData) => Promise<AppearanceActionState> }>;

export function AppearanceSettings({ action }: Props) {
  const { theme, savedTheme, previewTheme, cancelPreview } = useAppearance();
  const [state, submit, pending] = useActionState(async (previous: AppearanceActionState, form: FormData) => {
    const result = await action(previous, form);
    if (result.status === "success") cancelPreview();
    return result;
  }, { status: "idle" });
  // Discard an unsaved preview when Profile unmounts, including browser navigation.
  useEffect(() => () => cancelPreview(), [cancelPreview]);
  const dirty = theme !== savedTheme;

  return <section aria-labelledby="appearance-heading" className="mt-8 rounded-3xl border border-slate-800 bg-slate-900/60 p-5 sm:p-6">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-accent-400">Make it yours</p><h2 className="mt-2 text-2xl font-black" id="appearance-heading">Appearance</h2></div><span className="rounded-full bg-slate-800 px-3 py-2 text-xs text-slate-400">Saved: {accentPalette(savedTheme).name}</span></div>
    <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">Choose your accent color. Preview it across the app, then save it to your account for your phone and computer.</p>
    {/* Preview inputs are controlled; use the explicit Cancel/Reset actions instead of the native action reset. */}
    <form action={submit} className="mt-5" onReset={event => event.preventDefault()}>
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <fieldset className="min-w-0" disabled={pending}><legend className="text-sm font-bold">Accent color</legend>
        <div className="mt-3 grid grid-cols-1 gap-3 min-[360px]:grid-cols-2">
          {ACCENT_THEMES.map(option => <label className={`flex min-h-24 min-w-0 cursor-pointer items-center gap-3 rounded-2xl border p-3 transition-colors focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-accent-400 ${theme === option.id ? "border-accent-400 bg-accent-400/10" : "border-slate-700 bg-slate-950/50 hover:border-slate-500"} ${pending ? "cursor-wait opacity-60" : ""}`} key={option.id}>
            <input checked={theme === option.id} className="sr-only" name="accentTheme" onChange={() => previewTheme(option.id)} type="radio" value={option.id} />
            <span aria-hidden="true" className="flex size-9 shrink-0 items-center justify-center rounded-full text-lg font-black text-slate-950" style={{ backgroundColor: option.colors[400] }}>{theme === option.id ? "✓" : ""}</span>
            <span className="min-w-0"><strong className="block text-sm">{option.name}</strong><span className="mt-1 block text-xs leading-5 text-slate-400">{option.description}</span></span>
          </label>)}
        </div>
      </fieldset>
      <div className="min-w-0 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-bold">Color preview</p><span className="rounded-lg bg-accent-400/10 px-3 py-2 text-xs font-bold text-accent-300">{accentPalette(theme).name}</span></div>
        <div aria-label="Sample chart: theme colors only, no workout data" className="mt-5 flex h-28 items-end gap-2 border-b border-slate-700" role="img">{[35, 60, 45, 85, 65, 100].map((height, index) => <span className={`min-w-0 flex-1 rounded-t-md ${index === 5 ? "bg-accent-300" : "bg-accent-400/75"}`} key={index} style={{ height: `${height}%` }} />)}</div>
        <p className="mt-3 text-xs leading-5 text-slate-400">Sample chart · colors only</p>
        <p className="mt-3 text-xs leading-5 text-slate-400">Your accent applies to navigation, buttons and charts. Completion, warning and error colors keep their meaning.</p>
      </div></div>
      <div aria-live="polite" className="mt-5 text-sm leading-6 text-slate-400">{dirty ? <>Previewing <strong className="text-accent-300">{accentPalette(theme).name}</strong>. Save changes to keep this color.</> : <>Your saved theme is <strong className="text-slate-200">{accentPalette(savedTheme).name}</strong>.</>}</div>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <button className="min-h-12 rounded-xl bg-accent-400 px-5 font-bold text-slate-950 hover:bg-accent-300 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent-400 disabled:cursor-not-allowed disabled:opacity-40" disabled={!dirty || pending} type="submit">{pending ? "Saving…" : "Save changes"}</button>
        <button className="min-h-12 rounded-xl border border-slate-700 px-5 font-semibold text-slate-300 focus-visible:outline-2 focus-visible:outline-accent-400 disabled:opacity-40" disabled={!dirty || pending} onClick={cancelPreview} type="button">Cancel preview</button>
        <button className="min-h-12 rounded-xl px-3 text-sm font-semibold text-slate-400 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-accent-400 disabled:opacity-40 sm:ml-auto" disabled={theme === "lime" || pending} onClick={() => previewTheme("lime")} type="button">Reset to default</button>
      </div>
      {state.message && (state.status === "error" || !dirty) ? <p className={`mt-4 text-sm leading-6 ${state.status === "error" ? "text-red-200" : "text-success-300"}`} role={state.status === "error" ? "alert" : "status"}>{state.message}</p> : null}
    </form>
  </section>;
}
