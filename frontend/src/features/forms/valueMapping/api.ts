import { api } from "@/lib/api";

export type FieldMeta = {
  path: string;
  pathSegments: string[];
  normalizedPath: string;
  name: string;
  label: string;
  labelPath: string[];
  breadcrumb: string;
  kind: string;
  dtype?: string | null;
  valueType?: string | null;
  isArray: boolean;
  isAttribute: boolean;
  isChoice: boolean;
  refType?: string | null;
  minOccurs?: number | null;
  maxOccurs?: number | null;
  selectable: boolean;
  hasChildren: boolean;
  children: FieldMeta[];
};

export type DocumentFieldContext = {
  kind: "document";
  schemaId: number;
  schemaCode?: string | null;
  schemaTitle?: string | null;
  schemaName: string;
  schemaVersion?: string | null;
  description?: string | null;
  updatedAt?: string | null;
  hasUiOverrides?: boolean;
};

export type EntityFieldContext = {
  kind: "entity";
  entity: string;
  title: string;
  description?: string | null;
};

export type DocumentFieldStructure = {
  context: DocumentFieldContext;
  tree: FieldMeta[];
  matches: FieldMeta[];
  availableValueTypes: string[];
  query?: string | null;
  valueTypeFilter: string[];
};

export type EntityFieldStructure = {
  context: EntityFieldContext;
  tree: FieldMeta[];
  matches: FieldMeta[];
  availableValueTypes: string[];
  query?: string | null;
  valueTypeFilter: string[];
};

export type StructureParams = {
  query?: string;
  valueTypes?: string[];
};

type FetchOptions = {
  signal?: AbortSignal;
};

export async function fetchDocumentFieldStructure(
  schemaId: number,
  params: StructureParams = {},
  options: FetchOptions = {},
): Promise<DocumentFieldStructure> {
  const response = await api.get<RawDocumentFieldStructure>(
    `/value-links/structures/documents/${schemaId}`,
    {
      params: buildParams(params),
      paramsSerializer,
      signal: options.signal,
    },
  );

  return mapDocumentStructure(response.data);
}

export async function fetchEntityFieldStructure(
  entity: string,
  params: StructureParams = {},
  options: FetchOptions = {},
): Promise<EntityFieldStructure> {
  const response = await api.get<RawEntityFieldStructure>(
    `/value-links/structures/entities/${entity}`,
    {
      params: buildParams(params),
      paramsSerializer,
      signal: options.signal,
    },
  );

  return mapEntityStructure(response.data);
}

export async function fetchDocumentContexts(): Promise<DocumentFieldContext[]> {
  const response = await api.get<RawDocumentContext[]>("/value-links/contexts/documents");
  return response.data.map(mapDocumentContext);
}

export async function fetchEntityContexts(): Promise<EntityFieldContext[]> {
  const response = await api.get<RawEntityContext[]>("/value-links/contexts/entities");
  return response.data.map(mapEntityContext);
}

type RawFieldMeta = {
  path: string;
  path_segments: string[];
  normalized_path: string;
  name: string;
  label: string;
  label_path: string[];
  breadcrumb: string;
  kind: string;
  dtype?: string | null;
  value_type?: string | null;
  is_array: boolean;
  is_attribute: boolean;
  is_choice: boolean;
  ref_type?: string | null;
  min_occurs?: number | null;
  max_occurs?: number | null;
  selectable: boolean;
  has_children: boolean;
  children: RawFieldMeta[];
};

type RawDocumentFieldContext = {
  kind: "document";
  schema_id: number;
  schema_code?: string | null;
  schema_title?: string | null;
  schema_name: string;
  schema_version?: string | null;
  description?: string | null;
  updated_at?: string | null;
  has_ui_overrides?: boolean;
};

type RawEntityFieldContext = {
  kind: "entity";
  entity: string;
  title: string;
  description?: string | null;
};

type RawDocumentContext = RawDocumentFieldContext;
type RawEntityContext = RawEntityFieldContext;

type RawDocumentFieldStructure = {
  context: RawDocumentFieldContext;
  tree: RawFieldMeta[];
  matches: RawFieldMeta[];
  available_value_types: string[];
  query?: string | null;
  value_type_filter: string[];
};

type RawEntityFieldStructure = {
  context: RawEntityFieldContext;
  tree: RawFieldMeta[];
  matches: RawFieldMeta[];
  available_value_types: string[];
  query?: string | null;
  value_type_filter: string[];
};

function buildParams({ query, valueTypes }: StructureParams): Record<string, unknown> {
  return {
    query: query?.trim() ? query.trim() : undefined,
    value_types: valueTypes && valueTypes.length ? valueTypes : undefined,
  };
}

const paramsSerializer = {
  serialize(params: Record<string, unknown>) {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null || value === "") continue;
      if (Array.isArray(value)) {
        for (const item of value) {
          if (item === undefined || item === null || item === "") continue;
          search.append(key, String(item));
        }
      } else {
        search.append(key, String(value));
      }
    }
    return search.toString();
  },
};

function mapFieldMeta(raw: RawFieldMeta): FieldMeta {
  return {
    path: raw.path,
    pathSegments: [...raw.path_segments],
    normalizedPath: raw.normalized_path,
    name: raw.name,
    label: raw.label,
    labelPath: [...raw.label_path],
    breadcrumb: raw.breadcrumb,
    kind: raw.kind,
    dtype: raw.dtype ?? null,
    valueType: raw.value_type ?? null,
    isArray: raw.is_array,
    isAttribute: raw.is_attribute,
    isChoice: raw.is_choice,
    refType: raw.ref_type ?? null,
    minOccurs: raw.min_occurs ?? null,
    maxOccurs: raw.max_occurs ?? null,
    selectable: raw.selectable,
    hasChildren: raw.has_children,
    children: raw.children?.map(mapFieldMeta) ?? [],
  };
}

function mapDocumentStructure(raw: RawDocumentFieldStructure): DocumentFieldStructure {
  return {
    context: {
      kind: "document",
      schemaId: raw.context.schema_id,
      schemaCode: raw.context.schema_code ?? null,
      schemaTitle: raw.context.schema_title ?? null,
      schemaName: raw.context.schema_name,
      schemaVersion: raw.context.schema_version ?? null,
      description: raw.context.description ?? null,
      updatedAt: raw.context.updated_at ?? null,
      hasUiOverrides: raw.context.has_ui_overrides ?? false,
    },
    tree: raw.tree.map(mapFieldMeta),
    matches: raw.matches.map(mapFieldMeta),
    availableValueTypes: [...raw.available_value_types],
    query: raw.query ?? null,
    valueTypeFilter: [...raw.value_type_filter],
  };
}

function mapEntityStructure(raw: RawEntityFieldStructure): EntityFieldStructure {
  return {
    context: {
      kind: "entity",
      entity: raw.context.entity,
      title: raw.context.title,
      description: raw.context.description ?? null,
    },
    tree: raw.tree.map(mapFieldMeta),
    matches: raw.matches.map(mapFieldMeta),
    availableValueTypes: [...raw.available_value_types],
    query: raw.query ?? null,
    valueTypeFilter: [...raw.value_type_filter],
  };
}

function mapDocumentContext(raw: RawDocumentContext): DocumentFieldContext {
  return {
    kind: "document",
    schemaId: raw.schema_id,
    schemaCode: raw.schema_code ?? null,
    schemaTitle: raw.schema_title ?? null,
    schemaName: raw.schema_name,
    schemaVersion: raw.schema_version ?? null,
    description: raw.description ?? null,
    updatedAt: raw.updated_at ?? null,
    hasUiOverrides: raw.has_ui_overrides ?? false,
  };
}

function mapEntityContext(raw: RawEntityContext): EntityFieldContext {
  return {
    kind: "entity",
    entity: raw.entity,
    title: raw.title,
    description: raw.description ?? null,
  };
}
