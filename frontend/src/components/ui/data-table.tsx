"use client";

import React, { ReactNode } from "react";
import {
  ColumnDef,
  VisibilityState,
  ColumnSizingState,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

/** Generic DataTable with column visibility toggle. */
export function DataTable<TData, TValue>({
  columns,
  data,
  className,
  columnsTitle = "Колонки",
  initialVisibility,
  initialSizing,
  initialPageSize = 10,
  pageSizeOptions = [10, 50, 100],
}: {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  className?: string;
  columnsTitle?: string;
  initialVisibility?: VisibilityState;
  initialSizing?: ColumnSizingState;
  initialPageSize?: number;
  pageSizeOptions?: number[];
}) {
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>(initialVisibility ?? {});
  const [columnSizing] = React.useState<ColumnSizingState>(initialSizing ?? {});
  const [pageSize, setPageSize] = React.useState<number>(initialPageSize);
  const [pageIndex, setPageIndex] = React.useState<number>(0);
  const table = useReactTable({
    data,
    columns,
    state: {
      columnVisibility,
      columnSizing,
      pagination: { pageIndex, pageSize },
    },
    columnResizeMode: "onChange",
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: (updater) => {
      const next =
        typeof updater === "function"
          ? updater({ pageIndex, pageSize })
          : updater;
      if (next?.pageSize !== undefined) setPageSize(next.pageSize);
      if (next?.pageIndex !== undefined) setPageIndex(next.pageIndex);
    },
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const leaf = table.getAllLeafColumns();

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Список</h2>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="h-9 rounded-2xl border px-3 text-sm hover:bg-zinc-50">{columnsTitle}</button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="max-h-80 overflow-auto">
            {leaf.filter(c => c.getCanHide()).map((c) => (
              <DropdownMenuItem key={c.id} onSelect={(e) => e.preventDefault()}>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={c.getIsVisible()}
                    onChange={() => c.toggleVisibility()}
                  />
                  <span>{String(c.columnDef.header ?? c.id)}</span>
                </label>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="rounded-2xl border">
        <div className="overflow-x-auto">
          {/* width суммируется из размеров колонок; есть fallback min-w */}
          <Table className="min-w-[800px]" style={{ width: table.getCenterTotalSize() }}>
            <TableHeader>
              {table.getHeaderGroups().map((hg) => (
                <TableRow key={hg.id}>
                  {hg.headers.map((h) => (
                    <TableHead
                      key={h.id}
                      className={cn((h.column.columnDef as any)?.meta?.className)}
                      style={{ width: h.column.getSize() }}
                    >
                      {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.length ? (
                table.getRowModel().rows.map((r) => (
                  <TableRow
                    key={r.id}
                    data-state={r.getIsSelected() && "selected"}
                    className="transition-colors hover:bg-zinc-50"
                  >
                    {r.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        className={cn((cell.column.columnDef as any)?.meta?.className)}
                        style={{ width: cell.column.getSize() }}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={leaf.length} className="h-24 text-center">
                    Нет данных
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
      {/* Pagination bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-zinc-600">Показывать по:</span>
          <select
            className="h-9 rounded-2xl border px-3 text-sm bg-white"
            value={pageSize}
            onChange={(e) => table.setPageSize(Number(e.target.value))}
          >
            {pageSizeOptions.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="h-9 rounded-xl border px-2 text-sm hover:bg-zinc-50 disabled:opacity-50"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
            aria-label="Первая страница"
          >
            «
          </button>
          <button
            className="h-9 rounded-xl border px-3 text-sm hover:bg-zinc-50 disabled:opacity-50"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            aria-label="Предыдущая страница"
          >
            ‹
          </button>
          <span className="text-sm px-2">
            стр. {table.getState().pagination.pageIndex + 1} из {table.getPageCount()}
          </span>
          <button
            className="h-9 rounded-xl border px-3 text-sm hover:bg-zinc-50 disabled:opacity-50"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            aria-label="Следующая страница"
          >
            ›
          </button>
          <button
            className="h-9 rounded-xl border px-2 text-sm hover:bg-zinc-50 disabled:opacity-50"
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
            aria-label="Последняя страница"
          >
            »
          </button>
        </div>
      </div>
    </div>
  );
}
