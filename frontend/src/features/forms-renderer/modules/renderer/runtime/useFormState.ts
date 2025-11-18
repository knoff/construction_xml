import * as React from "react";
import { setAtPath, delAtPath, type Path as PathType } from "@/features/forms-renderer/core/utils/path";

export type FormStateController<T extends object> = {
  state: T;
  setPath: (path: PathType, value: unknown) => void;
  delPath: (path: PathType) => void;
  setState: React.Dispatch<React.SetStateAction<T>>;
};

export function useFormState<T extends object>(initial: T): FormStateController<T> {
  const [state, setState] = React.useState<T>(initial);

  const setPath = React.useCallback((path: PathType, value: unknown) => {
    setState((prev) => setAtPath(prev, path, value));
  }, []);

  const delPath = React.useCallback((path: PathType) => {
    setState((prev) => delAtPath(prev, path));
  }, []);

  return { state, setPath, delPath, setState };
}


