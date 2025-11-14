import * as React from "react";
import type { FieldModel } from "../../types";
import { getAtPath, pathKey } from "@/features/forms/utils/path";
import { getLocalErrorsForPath, hasRequiredWord } from "@/features/forms/utils/errors";
import { isRequiredField, isEmptyValue } from "@/features/forms/utils/xsd";
import { FieldLabel } from "../components/FieldLabel";
import { SimpleInput } from "../components/inputs/SimpleInput";
import { HelpText } from "../components/HelpText";

type ScalarFieldProps = {
  field: FieldModel;
  path: (string | number)[];
  state: unknown;
  setPath: (path: (string | number)[], value: unknown) => void;
  errors?: Record<string, string[]>;
};

export function ScalarField({ field, path, state, setPath, errors }: ScalarFieldProps) {
  const value = getAtPath(state, path);
  const localErrors = getLocalErrorsForPath(errors, path);
  const missingRequired = isRequiredField(field) && isEmptyValue(value);
  const validatorHasRequired = localErrors.some(hasRequiredWord);

  const displayErrors = React.useMemo(
    () =>
      Array.from(
        new Set([
          ...(missingRequired && !validatorHasRequired ? ["Поле обязательно"] : []),
          ...localErrors,
        ]),
      ),
    [localErrors, missingRequired, validatorHasRequired],
  );

  return (
    <div className="space-y-1">
      <FieldLabel field={field} path={path} value={value} />
      <SimpleInput field={field} path={path} value={value} onChange={(next) => setPath(path, next)} />
      <HelpText field={field} />
      {displayErrors.length > 0 && (
        <ul className="mt-1 text-xs text-red-600 list-disc pl-5">
          {displayErrors.map((error, index) => (
            <li key={`${pathKey(path)}-err-${index}`}>{error}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

