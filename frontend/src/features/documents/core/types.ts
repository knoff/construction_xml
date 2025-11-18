export type DocumentObjectRef = {
  id: number;
  uid?: string | null;
  name?: string | null;
};

export type DocumentSchemaRef = {
  id: number;
  name?: string | null;
  version?: string | null;
  code?: string | null;
};

export type DocumentSummary = {
  id: number;
  doc_uid?: string | null;
  status: string;
  object?: DocumentObjectRef | null;
  schema?: DocumentSchemaRef | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type DocumentVersion = {
  id: number;
  document_id: number;
  payload: any;
  created_at?: string | null;
  status?: string | null;
  is_protected?: boolean | null;
  is_selected?: boolean | null;
  validation?: {
    source?: string | null;
    checked_at?: string | null;
    errors_count?: number | null;
    errors?: Record<string, string[]> | null;
  } | null;
};

export type DocumentDetails = DocumentSummary & {
  latest_version_id?: number | null;
  payload?: any;
};

export type ObjectOption = {
  id: number;
  name: string;
};

export type SchemaOption = {
  id: number;
  name: string;
  version?: string | null;
};

export type DocumentCreatePayload = {
  object_id: number;
  schema_id: number;
  schema_version?: string | null;
};
