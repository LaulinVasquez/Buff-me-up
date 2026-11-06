"use client";
import { useEffect, useRef, useState, type FormEvent, type RefObject } from "react";

type Control = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
function controls(form: HTMLFormElement) {
  return Array.from(form.elements).filter((item): item is Control => item instanceof HTMLInputElement || item instanceof HTMLSelectElement || item instanceof HTMLTextAreaElement);
}
function reveal(control: Control) {
  for (let parent = control.parentElement; parent; parent = parent.parentElement) if (parent instanceof HTMLDetailsElement) parent.open = true;
  control.focus();
  control.reportValidity();
}
// Keep every screen mounted and enabled so one final FormData contains all answers.
export function useFormProcedure(guided: boolean, count: number) {
  const [step, setStep] = useState(0);
  const form = useRef<HTMLFormElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const invalid = useRef<Control | null>(null);
  const previousStep = useRef(0);
  useEffect(() => {
    if (step === previousStep.current) return;
    previousStep.current = step;
    if (invalid.current) { reveal(invalid.current); invalid.current = null; }
    else heading.current?.focus();
  }, [step]);
  const check = (all: boolean) => {
    if (!form.current) return false;
    const target = controls(form.current).find(control => control.willValidate && !control.validity.valid && (all || control.closest("[data-procedure-step]")?.getAttribute("data-procedure-step") === String(step)));
    if (!target) return true;
    const targetStep = Number(target.closest("[data-procedure-step]")?.getAttribute("data-procedure-step") ?? step);
    if (targetStep !== step && targetStep >= 0 && targetStep < count) { invalid.current = target; setStep(targetStep); }
    else reveal(target);
    return false;
  };
  return {
    step, form, heading,
    back: () => setStep(current => Math.max(0, current - 1)),
    onSubmit: (event: FormEvent<HTMLFormElement>) => {
      if (!guided) return;
      const submitter = (event.nativeEvent as SubmitEvent).submitter;
      if (submitter instanceof HTMLButtonElement && submitter.name === "intent" && submitter.value === "skip") return;
      if (step < count - 1) { event.preventDefault(); if (check(false)) setStep(step + 1); }
      else if (!check(true)) event.preventDefault();
    },
  };
}
export function ProcedureProgress({labels,step,heading}:{labels:readonly string[];step:number;heading:RefObject<HTMLHeadingElement|null>}) {
  return <div className="mt-5">
    <p aria-live="polite" className="text-xs font-semibold text-accent-300">Step {step + 1} of {labels.length}</p>
    <ol aria-label="Form progress" className="mt-3 grid grid-cols-3 gap-2">{labels.map((label,index)=><li key={label} aria-current={step===index?"step":undefined} className={`min-w-0 rounded-xl border px-2 py-3 text-xs leading-5 ${step===index?"border-accent-400 bg-accent-400/10 text-accent-300":"border-slate-700 text-slate-400"}`}><span className="block font-bold">{index<step?"✓":index+1}</span>{label}</li>)}</ol>
    <h3 ref={heading} tabIndex={-1} className="mt-5 text-lg font-bold outline-none">{labels[step]}</h3>
  </div>;
}
