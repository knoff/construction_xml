import * as React from "react";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";

export type FileRow = {
  id: number;
  object_id: number | null;
  original_name: string;
  title?: string | null;
  doc_number?: string | null;
  doc_date?: string | null;
  author?: string | null;
  doc_type?: string | null;
  group?: "IRD" | "PD" | null;
  mime?: string | null;
  size: number;
  sha256: string;
  crc32: string;
  versions_count?: number;
  created_at?: string | null;
};

type Actions = {
  onCopyId?: (id:number)=>void;
  onDownload?: (row: FileRow)=>void;
  onUploadSig?: (row: FileRow)=>void;
  onOpenMeta?: (row: FileRow)=>void;
  onDelete?: (row: FileRow)=>void;
  onOpenVersions?: (row: FileRow)=>void;
};

export function makeFileColumns(actions: Actions = {}) {
  const cols = [
    {
      accessorKey: "versions_count",
      header: "Версий",
      cell: ({ row }) => <span className="tabular-nums">{row.original.versions_count ?? 0}</span>
    },
    { accessorKey: "original_name", header: "Имя файла" },
    { accessorKey: "title", header: "Название" },
    { accessorKey: "doc_number", header: "Номер" },
    { accessorKey: "crc32", header: "CRC32" },
    { accessorKey: "doc_date", header: "Дата" },
    { accessorKey: "author", header: "Автор" },
    { accessorKey: "doc_type", header: "Тип" },
    { accessorKey: "group", header: "Группа" },
    {
      accessorKey: "sha256",
      header: "SHA-256",
      cell: ({ row }: any) => <code title={row.original?.sha256}>{String(row.original?.sha256 || "").slice(0, 20)}…</code>
    },
    {
      accessorKey: "size",
      header: "Размер",
      cell: ({ row }: any) => `${(Number(row.original?.size||0)/1024/1024).toFixed(2)} МБ`
    },
    {
      id: "actions",
      header: "Действия",
      enableHiding: false,
      meta: { className: "sticky right-0 z-10 bg-[var(--background)] border-l" },
      cell: ({ row }: any) => {
        const f = row.original as FileRow;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="h-8 w-8 rounded-xl hover:bg-zinc-100" aria-label="Действия">⋯</button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Действия</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => actions.onCopyId?.(f.id)}>Скопировать ID</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => actions.onOpenVersions?.(f)}>Версии</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => actions.onOpenMeta?.(f)}>Редактировать данные</DropdownMenuItem>
              <DropdownMenuItem onClick={() => actions.onDownload?.(f)} disabled>Скачать</DropdownMenuItem>
              <DropdownMenuItem onClick={() => actions.onUploadSig?.(f)} disabled>Загрузить .sig</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-600" onClick={() => actions.onDelete?.(f)}>
                Удалить
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      }
    }
  ];
  return cols as any;
}

export const initialFilesVisibility = {
  // по умолчанию видимы 4 колонки: Имя файла, Название, Номер, CRC32
  original_name: true,
  title: true,
  doc_number: true,
  crc32: true,
  // остальные скрыты (включаем через меню таблицы)
  doc_date: false,
  author: false,
  doc_type: false,
  group: false,
  sha256: false,
  size: false,
  actions: true,
};

export const initialFilesSizing = {
  // сумма видимых = 850: 30 + 300 + 300 + 120 + 100
  versions_count: 30,
  original_name: 300,
  title: 300,
  doc_number: 120,
  crc32: 100,
  // остальное — разумные дефолты
  doc_date: 120,
  author: 180,
  doc_type: 160,
  group: 90,
  sha256: 220,
  size: 100,
  actions: 64,
};
