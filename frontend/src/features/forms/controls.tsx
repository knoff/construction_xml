import * as React from "react";
import type { FieldModel, Facets } from "./types";

// Map xs: types to input kinds
export function inputKind(dtype: string, facets?: Facets): "text" | "number" | "date" | "select" {
  if (facets?.enumOptions?.length || facets?.enum?.length) return "select";
  switch (dtype) {
    case "xs:int":
    case "xs:integer":
    case "xs:long":
    case "xs:decimal":
    case "xs:float":
    case "xs:double":
      return "number";
    case "xs:date":
    case "xs:dateTime":
      return "date";
    default:
      return "text";
  }
}

export function coerceValue(dtype: string, raw: any) {
  if (raw == null || raw === "") return raw;
  switch (dtype) {
    case "xs:int":
    case "xs:integer":
    case "xs:long":
      return Number.parseInt(String(raw), 10);
    case "xs:decimal":
    case "xs:float":
    case "xs:double":
      return Number(raw);
    default:
      return raw;
  }
}
