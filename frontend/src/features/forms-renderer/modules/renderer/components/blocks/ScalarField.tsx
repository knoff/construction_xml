import * as React from "react";
import type { FieldModel } from "@/features/forms-renderer/core/types";
import { getAtPath, pathKey } from "@/features/forms-renderer/core/utils/path";
import { getLocalErrorsForPath, hasRequiredWord } from "@/features/forms-renderer/core/utils/errors";
import { isRequiredField, isEmptyValue } from "@/features/forms-renderer/core/utils/xsd";
import { FieldLabel } from "../FieldLabel";
import { SimpleInput } from "../inputs/SimpleInput";
import { HelpText } from "../HelpText";

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


