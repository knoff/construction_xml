import type { AxiosError } from "axios";

import { api } from "@/lib/api";

import type {
  DocumentCreatePayload,
  DocumentDetails,
  DocumentObjectRef,
  DocumentSchemaRef,
  DocumentSummary,
  DocumentVersion,
  ObjectOption,
  SchemaOption,
} from "../core/types";
import type { UiOverrides } from "../core/contexts";

function toError(error: unknown): Error {
  if (error instanceof Error) return error;
  if (typeof error === "string") return new Error(error);
  const axiosErr = error as AxiosError<any>;
  if (axiosErr?.isAxiosError) {
    const detail = axiosErr.response?.data;
    if (typeof detail === "string") return new Error(detail);
    if (detail && typeof detail === "object") {
      const message = (detail as any).detail ?? JSON.stringify(detail);
      return new Error(String(message));
    }
    return new Error(axiosErr.message);
  }
  return new Error(String(error));
}

export async function fetchDocuments(): Promise<DocumentSummary[]> {
  try {
    const { data } = await api.get<DocumentSummary[]>("/documents/");
    return data ?? [];
  } catch (error) {
    throw toError(error);
  }
}

export async function fetchDocument(documentId: number | string): Promise<DocumentDetails> {
  try {
    const { data } = await api.get<DocumentDetails>(`/documents/${documentId}`);
    return data;
  } catch (error) {
    throw toError(error);
  }
}

export async function createDocument(payload: DocumentCreatePayload): Promise<DocumentDetails> {
  try {
    const { data } = await api.post<DocumentDetails>("/documents/", payload);
    return data;
  } catch (error) {
    throw toError(error);
  }
}

export async function updateDocument(
  documentId: number | string,
  payload: Partial<{ object_id: number; schema_id: number; status: string }>,
): Promise<void> {
  try {
    await api.patch(`/documents/${documentId}`, payload);
  } catch (error) {
    throw toError(error);
  }
}

export async function deleteDocument(documentId: number | string): Promise<void> {
  try {
    await api.delete(`/documents/${documentId}`);
  } catch (error) {
    throw toError(error);
  }
}

export async function fetchDocumentVersions(documentId: number | string): Promise<DocumentVersion[]> {
  try {
    const { data } = await api.get<DocumentVersion[]>(`/documents/${documentId}/versions`);
    return Array.isArray(data) ? data : [];
  } catch (error) {
    throw toError(error);
  }
}

export async function fetchDocumentVersion(documentId: number | string, versionId: number | string): Promise<DocumentVersion> {
  try {
    const { data } = await api.get<DocumentVersion>(`/documents/${documentId}/versions/${versionId}`);
    return data;
  } catch (error) {
    throw toError(error);
  }
}

export async function updateDocumentVersionPayload(
  documentId: number | string,
  versionId: number | string,
  payload: unknown,
): Promise<void> {
  try {
    await api.patch(`/documents/${documentId}/versions/${versionId}`, { payload });
  } catch (error) {
    throw toError(error);
  }
}

export async function createDocumentVersion(documentId: number | string, payload: unknown): Promise<DocumentVersion> {
  try {
    const { data } = await api.post<DocumentVersion>(`/documents/${documentId}/versions`, { payload });
    return data;
  } catch (error) {
    throw toError(error);
  }
}

export async function selectDocumentVersion(documentId: number | string, versionId: number | string): Promise<void> {
  try {
    await api.post(`/documents/${documentId}/versions/${versionId}/select`, {});
  } catch (error) {
    throw toError(error);
  }
}

export async function freezeDocumentVersion(documentId: number | string, versionId: number | string): Promise<void> {
  try {
    await api.post(`/documents/${documentId}/versions/${versionId}/freeze`, {});
  } catch (error) {
    throw toError(error);
  }
}

export async function unfreezeDocumentVersion(documentId: number | string, versionId: number | string): Promise<void> {
  try {
    await api.post(`/documents/${documentId}/versions/${versionId}/unfreeze`, {});
  } catch (error) {
    throw toError(error);
  }
}

export async function fetchObjects(): Promise<ObjectOption[]> {
  try {
    const { data } = await api.get<ObjectOption[]>("/objects/");
    return Array.isArray(data) ? data : [];
  } catch (error) {
    throw toError(error);
  }
}

export async function fetchSchemas(): Promise<SchemaOption[]> {
  try {
    const { data } = await api.get<SchemaOption[]>("/schemas");
    return Array.isArray(data) ? data : [];
  } catch (error) {
    throw toError(error);
  }
}

export async function fetchSchemaInternalModel<T = any>(schemaId: number | string): Promise<T> {
  try {
    const { data } = await api.get<T>(`/schemas/${schemaId}/internal-model`);
    return data;
  } catch (error) {
    throw toError(error);
  }
}

export async function fetchSchemaUiOverrides(schemaId: number | string): Promise<UiOverrides | undefined> {
  try {
    const { data } = await api.get<{ ui_overrides?: UiOverrides }>(`/schemas/${schemaId}/ui-overrides`);
    return data?.ui_overrides;
  } catch (error) {
    throw toError(error);
  }
}

export async function updateSchemaUiOverrides(
  schemaId: number | string,
  overrides: UiOverrides,
): Promise<void> {
  try {
    await api.put(`/schemas/${schemaId}/ui-overrides`, { ui_overrides: overrides });
  } catch (error) {
    throw toError(error);
  }
}
