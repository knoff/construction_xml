import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  fetchDocuments,
  fetchDocument,
  fetchDocumentVersions,
  fetchDocumentVersion,
  fetchObjects,
  fetchSchemas,
  createDocument,
  updateDocument,
  deleteDocument,
  createDocumentVersion,
  updateDocumentVersionPayload,
  selectDocumentVersion,
  freezeDocumentVersion,
  unfreezeDocumentVersion,
} from "../adapters/api";
import type {
  DocumentCreatePayload,
  DocumentDetails,
  DocumentSummary,
  DocumentVersion,
  ObjectOption,
  SchemaOption,
} from "../core/types";

const DOCUMENTS_KEY = ["documents", "list"] as const;
const DOCUMENT_DETAILS_KEY = (id: number | string) => ["documents", "details", String(id)] as const;
const DOCUMENT_VERSIONS_KEY = (id: number | string) => ["documents", "versions", String(id)] as const;
const OBJECTS_KEY = ["documents", "objects"] as const;
const SCHEMAS_KEY = ["documents", "schemas"] as const;

export function useDocumentsListPage() {
  const queryClient = useQueryClient();

  const documentsQuery = useQuery<DocumentSummary[], Error>({ queryKey: DOCUMENTS_KEY, queryFn: fetchDocuments });
  const objectsQuery = useQuery<ObjectOption[], Error>({ queryKey: OBJECTS_KEY, queryFn: fetchObjects });
  const schemasQuery = useQuery<SchemaOption[], Error>({ queryKey: SCHEMAS_KEY, queryFn: fetchSchemas });

  const createMutation = useMutation<DocumentDetails, Error, DocumentCreatePayload>({
    mutationFn: createDocument,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: DOCUMENTS_KEY });
    },
  });

  const updateMutation = useMutation<void, Error, { id: number; payload: Partial<{ object_id: number; schema_id: number; status: string }> }>(
    {
      mutationFn: ({ id, payload }) => updateDocument(id, payload),
      onSuccess: (_, variables) => {
        void Promise.all([
          queryClient.invalidateQueries({ queryKey: DOCUMENTS_KEY }),
          queryClient.invalidateQueries({ queryKey: DOCUMENT_DETAILS_KEY(variables.id) }),
        ]);
      },
    },
  );

  const deleteMutation = useMutation<void, Error, number>({
    mutationFn: (id) => deleteDocument(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: DOCUMENTS_KEY });
    },
  });

  const documentDetails = useCallback(
    (documentId: number | string) =>
      queryClient.ensureQueryData<DocumentDetails, Error>({
        queryKey: DOCUMENT_DETAILS_KEY(documentId),
        queryFn: () => fetchDocument(documentId),
      }),
    [queryClient],
  );

  const documentVersions = useCallback(
    (documentId: number | string) =>
      queryClient.ensureQueryData<DocumentVersion[], Error>({
        queryKey: DOCUMENT_VERSIONS_KEY(documentId),
        queryFn: () => fetchDocumentVersions(documentId),
      }),
    [queryClient],
  );

  const documentVersion = useCallback(
    (documentId: number | string, versionId: number | string) =>
      queryClient.ensureQueryData<DocumentVersion, Error>({
        queryKey: [...DOCUMENT_VERSIONS_KEY(documentId), String(versionId)] as const,
        queryFn: () => fetchDocumentVersion(documentId, versionId),
      }),
    [queryClient],
  );

  const createVersionMutation = useMutation<DocumentVersion, Error, { documentId: number; payload: unknown }>({
    mutationFn: ({ documentId, payload }) => createDocumentVersion(documentId, payload),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: DOCUMENT_VERSIONS_KEY(variables.documentId) });
    },
  });

  const updateVersionMutation = useMutation<
    void,
    Error,
    { documentId: number; versionId: number; payload: unknown }
  >({
    mutationFn: ({ documentId, versionId, payload }) => updateDocumentVersionPayload(documentId, versionId, payload),
    onSuccess: (_, variables) => {
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: DOCUMENT_VERSIONS_KEY(variables.documentId) }),
        queryClient.invalidateQueries({ queryKey: [...DOCUMENT_VERSIONS_KEY(variables.documentId), String(variables.versionId)] }),
      ]);
    },
  });

  const selectVersionMutation = useMutation<void, Error, { documentId: number; versionId: number }>({
    mutationFn: ({ documentId, versionId }) => selectDocumentVersion(documentId, versionId),
    onSuccess: (_, variables) => {
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: DOCUMENTS_KEY }),
        queryClient.invalidateQueries({ queryKey: DOCUMENT_VERSIONS_KEY(variables.documentId) }),
      ]);
    },
  });

  const freezeVersionMutation = useMutation<void, Error, { documentId: number; versionId: number }>({
    mutationFn: ({ documentId, versionId }) => freezeDocumentVersion(documentId, versionId),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: DOCUMENT_VERSIONS_KEY(variables.documentId) });
    },
  });

  const unfreezeVersionMutation = useMutation<void, Error, { documentId: number; versionId: number }>({
    mutationFn: ({ documentId, versionId }) => unfreezeDocumentVersion(documentId, versionId),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: DOCUMENT_VERSIONS_KEY(variables.documentId) });
    },
  });

  return {
    documentsQuery,
    objectsQuery,
    schemasQuery,
    createMutation,
    updateMutation,
    deleteMutation,
    documentDetails,
    documentVersions,
    documentVersion,
    createVersionMutation,
    updateVersionMutation,
    selectVersionMutation,
    freezeVersionMutation,
    unfreezeVersionMutation,
  } as const;
}
