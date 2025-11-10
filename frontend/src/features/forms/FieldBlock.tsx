import * as React from "react";
import type { FieldModel } from "./types";
import { pathKey } from "@/features/forms/utils/path";
import { isArrayMultiplicity } from "@/features/forms/utils/xsd";
import { countSubtreeErrors } from "@/features/forms/utils/errors";
import { ScalarField } from "./Renderer/blocks/ScalarField";
import { ScalarArray } from "./Renderer/blocks/ScalarArray";
import { SingleChoice } from "./Renderer/blocks/SingleChoice";
import { ArrayChoice } from "./Renderer/blocks/ArrayChoice";
import { ComplexSingle } from "./Renderer/blocks/ComplexSingle";
import { ComplexArray } from "./Renderer/blocks/ComplexArray";
import { useResolvedField } from "./Renderer/utils";

type FieldBlockProps = {
  field: FieldModel;
  path: (string | number)[];
  state: unknown;
  setPath: (path: (string | number)[], value: unknown) => void;
  delPath: (path: (string | number)[]) => void;
  types: Record<string, any>;
  visitedTypes: Set<string>;
  errors?: Record<string, string[]>;
};

export function FieldBlock(props: FieldBlockProps) {
  const { field, path, state, setPath, delPath, types, visitedTypes, errors } = props;
  const resolvedField = useResolvedField(field, types, visitedTypes);
  const thisKey = pathKey(path);
  const nodeErrors = errors?.[thisKey] ?? [];

  const nextVisited = React.useMemo(() => {
    const next = new Set<string>(visitedTypes);
    if (resolvedField?.refType) {
      next.add(String(resolvedField.refType));
    }
    return next;
  }, [visitedTypes, resolvedField?.refType]);

  const renderField = React.useCallback(
    (child: FieldModel, childPath: (string | number)[]) => (
      <FieldBlock
        key={childPath.join(".")}
        field={child}
        path={childPath}
        state={state}
        setPath={setPath}
        delPath={delPath}
        types={types}
        visitedTypes={nextVisited}
        errors={errors}
      />
    ),
    [state, setPath, delPath, types, nextVisited, errors],
  );

  // Attribute or simple scalar
  if (
    resolvedField.kind === "attribute" ||
    (resolvedField.dtype !== "object" && !resolvedField.children && !resolvedField.attributes)
  ) {
    return (
      <ScalarField
        field={resolvedField}
        path={path}
        state={state}
        setPath={setPath}
        errors={errors}
      />
    );
  }

  // Simple array of scalars
  if (
    resolvedField.kind !== "attribute" &&
    resolvedField.dtype !== "object" &&
    isArrayMultiplicity(resolvedField)
  ) {
    const subtreeMeta = countSubtreeErrors(errors ?? {}, thisKey);
    return (
      <ScalarArray
        field={resolvedField}
        path={path}
        state={state}
        setPath={setPath}
        delPath={delPath}
        hasSubtreeErrors={subtreeMeta.count > 0}
        nodeErrors={nodeErrors}
      />
    );
  }

  // Choice structures
  if (resolvedField.kind === "choice") {
    if (isArrayMultiplicity(resolvedField)) {
      return (
        <ArrayChoice
          field={resolvedField}
          path={path}
          state={state}
          setPath={setPath}
          delPath={delPath}
          renderField={renderField}
          errors={errors}
        />
      );
    }

    return (
      <SingleChoice
        field={resolvedField}
        path={path}
        state={state}
        setPath={setPath}
        renderField={renderField}
        errors={errors}
      />
    );
  }

  // Complex structures
  if (isArrayMultiplicity(resolvedField)) {
    return (
      <ComplexArray
        field={resolvedField}
        path={path}
        state={state}
        setPath={setPath}
        delPath={delPath}
        renderField={renderField}
        errors={errors}
        isBlock={Boolean(resolvedField?.refType && types?.[resolvedField.refType]?.kind === "complexType")}
      />
    );
  }

  return (
    <ComplexSingle
      field={resolvedField}
      path={path}
      state={state}
      setPath={setPath}
      delPath={delPath}
      renderField={renderField}
      errors={errors}
      isBlock={Boolean(resolvedField?.refType && types?.[resolvedField.refType]?.kind === "complexType")}
    />
  );
}

