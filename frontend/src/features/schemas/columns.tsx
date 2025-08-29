"use client";

import { ColumnDef } from "@tanstack/react-table";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { formatDateTime } from "@/lib/format";

export type SchemaRow = {
  id: number | string;
  name: string;
  version?: string;
  namespace?: string;
  description?: string;
  file_path?: string;
  created_at?: string;
  type?: { id?: number | string; title?: string; code?: string };
};

export function makeSchemaColumns(opts: {
  onView: (id: number | string) => void;
  onEdit?: (id: number | string) => void;
  onDelete?: (row: SchemaRow) => void;
}): ColumnDef<SchemaRow>[] {
  const { onView, onEdit, onDelete } = opts;;
  return [
  { accessorKey: "name", header: "Имя" },
  { accessorKey: "version", header: "Версия" },
  {
    id: "type_title",
    header: "Тип (имя)",
    cell: ({ row }) => row.original.type?.title ?? ""
  },
  {
    id: "type_code",
    header: "Тип (код)",
    cell: ({ row }) => row.original.type?.code ?? ""
  },
  { accessorKey: "namespace", header: "Namespace" },
  { accessorKey: "description", header: "Описание" },
  { accessorKey: "file_path", header: "Путь к файлу" },
  { accessorKey: "created_at", header: "Загружено",
    cell: ({ row }) => formatDateTime(row.original.created_at)
  },
  { accessorKey: "id", header: "ID" },
  {
    id: "actions",
    header: "Действия",
    enableHiding: false,
    meta: {
      // sticky right column for header & cells
      className: "sticky right-0 z-10 bg-[var(--background)] border-l"
    },
    cell: ({ row }) => {
      const s = row.original;
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="h-8 w-8 rounded-xl hover:bg-zinc-100" aria-label="Действия">⋯</button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Действия</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => navigator.clipboard.writeText(String(s.id))}>
              Скопировать ID
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onView(s.id)}>Открыть</DropdownMenuItem>
            {onEdit && <DropdownMenuItem onClick={() => onEdit(s.id)}>Изменить</DropdownMenuItem>}
            {onDelete && (
              <DropdownMenuItem
                onClick={() => onDelete(s)}
                className="text-red-600 focus:text-red-700"
              >
                Удалить
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      );
    }
  }
  ];
}
