import * as React from "react";
import type { FieldModel } from "@/features/forms-renderer/core/types";
import { getAtPath } from "@/features/forms-renderer/core/utils/path";
import { isArrayMultiplicity, isRequiredField, isEmptyValue } from "@/features/forms-renderer/core/utils/xsd";

const CHOICE_LEGACY_RE = /^__choice__#\d{2}$/;

export function isNamedChoice(name?: string) {
  return typeof name === "string" && CHOICE_LEGACY_RE.test(name);
}

export function readChoiceContainer(
  state: unknown,
  path: (string | number)[],
  field: FieldModel,
  options: { name: string }[],
) {
  const current = getAtPath(state, path);
  if (current != null || !isNamedChoice(field.name)) {
    return current;
  }

  const legacyPath = [...path.slice(0, -1), "__choice__"];
  const legacy = getAtPath(state, legacyPath);
  if (legacy == null) {
    return current;
  }

  const allowed = new Set(options.map((o) => o.name));

  if (Array.isArray(legacy)) {
    return legacy.filter((item) => {
      if (!item || typeof item !== "object") return false;
      const key = Object.keys(item as Record<string, unknown>)[0];
      return key ? allowed.has(key) : false;
    });
  }

  if (legacy && typeof legacy === "object") {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(legacy)) {
      if (allowed.has(key)) {
        out[key] = (legacy as Record<string, unknown>)[key];
      }
    }
    return Object.keys(out).length ? out : current;
  }

  return current;
}

export function composeChoiceContainer(arr: unknown[], obj: Record<string, unknown>) {
  if (Object.keys(obj).length > 0) {
    const out: Record<string, unknown> = { ...obj };
    arr.forEach((value, index) => {
      out[String(index)] = value;
    });
    return out;
  }
  return arr;
}

export function clearContainerForSelect(
  container: Record<string, unknown> | undefined,
  options: any[],
  nextName: string,
) {
  const out = { ...(container ?? {}) };
  const sequence = options.find((o) => o.kind === "sequence");

  for (const option of options.filter((o) => o.kind !== "sequence")) {
    if (option.name !== nextName) {
      delete out[option.name];
    }
  }

  if (sequence && Array.isArray(sequence.children) && nextName !== "__sequence__") {
    for (const child of sequence.children) {
      delete out[child.name];
    }
  }

  if (nextName === "__sequence__") {
    for (const option of options.filter((o) => o.kind !== "sequence")) {
      delete out[option.name];
    }
  }

  return out;
}

export function shallowMissingForField(field: FieldModel, valueAtPath: unknown): boolean {
  if (isArrayMultiplicity(field)) {
    const min = field.minOccurs ?? 1;
    const arrayValue = Array.isArray(valueAtPath) ? valueAtPath : [];
    return min > 0 && arrayValue.length === 0;
  }

  if (field.kind === "attribute" || (field.dtype !== "object" && !field.children && !field.attributes)) {
    return isRequiredField(field) && isEmptyValue(valueAtPath);
  }

  if ((field.minOccurs ?? 1) > 0 && valueAtPath == null && field.dtype === "object") {
    return true;
  }

  return false;
}

export function useResolvedField(
  field: FieldModel,
  types: Record<string, any>,
  visitedTypes: Set<string>,
) {
  return React.useMemo(() => {
    if (field?.refType && types?.[field.refType]?.kind === "complexType") {
      if (visitedTypes.has(field.refType)) {
        return field;
      }

      const typeMeta = types[field.refType];
      return {
        ...field,
        documentation: field.documentation ?? typeMeta.documentation ?? undefined,
        children: field.children ?? (typeMeta.children as FieldModel[] | undefined),
        attributes: field.attributes ?? (typeMeta.attributes as FieldModel[] | undefined),
      };
    }

    return field;
  }, [field, types, visitedTypes]);
}


