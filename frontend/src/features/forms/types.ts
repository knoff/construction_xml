export type FieldDoc = { label?: string; help?: string };
export type Facets = {
  enum?: string[];
  enumOptions?: { value: string; label?: string; help?: string }[];
  pattern?: string;
  minLength?: number;
  maxLength?: number;
  minInclusive?: string;
  maxInclusive?: string;
  minExclusive?: string;
  maxExclusive?: string;
};

export type FieldModel = {
  kind: 'element' | 'attribute' | 'choice';
  name: string;
  dtype: string;                // "xs:string" | "object" | named type
  refType?: string;             // when points to named type
  minOccurs?: number;
  maxOccurs?: number | null;    // null => unbounded
  required?: boolean;           // for attributes
  documentation?: FieldDoc;
  facets?: Facets;
  children?: FieldModel[];      // for complex/object
  attributes?: FieldModel[];
};

export type SchemaModel = {
  root: FieldModel[];
  types: Record<string, any>;
};
