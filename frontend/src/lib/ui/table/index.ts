import type { OnChangeFn, VisibilityState } from "@tanstack/react-table";
import { useCallback, useMemo, useState } from "react";

export interface TableState<TData> {
  data: TData[];
  columnVisibility: VisibilityState;
  onColumnVisibilityChange: OnChangeFn<VisibilityState>;
}

export interface UseTableControllerOptions<TData> {
  data: TData[];
  initialVisibility?: VisibilityState;
}

export function useTableController<TData>({
  data,
  initialVisibility,
}: UseTableControllerOptions<TData>): TableState<TData> {
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(
    initialVisibility ?? {},
  );

  const handleVisibilityChange = useCallback<OnChangeFn<VisibilityState>>(
    (updater) => {
      setColumnVisibility((prev) => {
        if (typeof updater === "function") {
          return updater(prev);
        }
        return updater;
      });
    },
    [],
  );

  return useMemo(() => ({
    data,
    columnVisibility,
    onColumnVisibilityChange: handleVisibilityChange,
  }), [data, columnVisibility, handleVisibilityChange]);
}
