import type { ExtensionsMappingResponse, ExtensionBinding } from "./types";

export async function fetchExtensionsMapping(schemaId: number): Promise<ExtensionsMappingResponse> {
  const r = await fetch(`/api/schemas/${schemaId}/form-extensions`, { method: "GET", cache: "no-store" });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function upsertExtensionBinding(schemaId: number, binding: ExtensionBinding): Promise<void> {
  const r = await fetch(`/api/schemas/${schemaId}/form-extensions`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(binding),
  });
  if (!r.ok) throw new Error(await r.text());
}
