export type HeightUnit = "ft-in" | "cm";
export type WeightUnit = "lb" | "kg";
export const KG_PER_LB = 0.45359237;
const number = (value: string) => value.trim() === "" ? null : Number(value);
export function imperialHeightCm(feet: string, inches: string): number | null {
  const ft = number(feet), inch = number(inches);
  if (ft === null && inch === null) return null;
  if (ft === null || !Number.isInteger(ft) || ft < 0 || (inch !== null && (!Number.isFinite(inch) || inch < 0 || inch >= 12))) return NaN;
  return Math.round((ft * 12 + (inch ?? 0)) * 2.54 * 1e6) / 1e6;
}
export function weightKg(value: string, unit: WeightUnit): number | null {
  const parsed = number(value);
  return parsed === null ? null : unit === "kg" ? parsed : Math.round(parsed * KG_PER_LB * 1e6) / 1e6;
}
export function heightFields(cm: number | null) {
  if (cm === null || !Number.isFinite(cm)) return { cm: "", feet: "", inches: "" };
  const total = Math.round(cm / 2.54 * 100) / 100;
  const feet = Math.floor(total / 12);
  return { cm: String(cm), feet: String(feet), inches: String(Math.round((total - feet * 12) * 100) / 100) };
}
export function weightFields(kg: number | null) {
  return kg === null || !Number.isFinite(kg) ? { kg: "", lb: "" } : { kg: String(kg), lb: String(Math.round(kg / KG_PER_LB * 100) / 100) };
}
