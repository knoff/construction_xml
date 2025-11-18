import type { FieldModel } from "../types";

export function isArrayMultiplicity(f: { maxOccurs?: number | null }) {
  const max = f.maxOccurs === null ? Infinity : (f.maxOccurs ?? 1);
  return max > 1 || f.maxOccurs === null;
}
export function isRequiredField(f: { kind: string; minOccurs?: number; required?: boolean }) {
  if (f.kind === "attribute") return f.required === true;
  return (f.minOccurs ?? 1) >= 1;
}

export function isEmptyValue(v: any): boolean {
  if (v == null) return true;
  if (typeof v === "string") return v.trim() === "";
  return false;
}

// DEBUG: show min/max; if max undefined or null → ∞
export function minMaxText(f: FieldModel) {
  const min = f.minOccurs ?? 0;
  const maxDbg = (f.maxOccurs == null) ? "∞" : String(f.maxOccurs);
  return `(min=${min}, max=${maxDbg})`;
}
