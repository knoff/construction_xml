"use client";
import { ColumnDef } from "@tanstack/react-table";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { formatDateTime } from "@/lib/format";

export type DocumentRow = {
  id: number | string;
  status: "draft" | "final";
  object?: { id: number | string; name: string };
  schema?: { id: number | string; name: string; version?: string };
  created_at?: string;
  updated_at?: string;
};

export function makeDocumentColumns(opts: {
  onView: (id: number | string) => void;
  onEdit: (id: number | string) => void;  // смена статуса — мелкое редактирование
  onDelete: (row: DocumentRow) => void;
  onFill: (id: number | string) => void;
  onVersions: (id: number | string) => void;
}): ColumnDef<DocumentRow>[] {
  const { onView, onEdit, onDelete, onVersions, onFill } = opts;
  return [
    { id: "object_name", header: "Объект", cell: ({ row }) => row.original.object?.name ?? "" },
    { id: "schema_name", header: "Схема", cell: ({ row }) => row.original.schema?.name ?? "" },
    { id: "schema_version", header: "Версия", cell: ({ row }) => row.original.schema?.version ?? "" },
    { accessorKey: "status", header: "Статус" },
    { accessorKey: "created_at", header: "Создан",
      cell: ({ row }) => formatDateTime(row.original.created_at as any)
    },
    { accessorKey: "updated_at", header: "Обновлён",
      cell: ({ row }) => formatDateTime(row.original.updated_at as any)
    },
    { accessorKey: "id", header: "ID" },
    {
      id: "actions",
      header: "Действия",
      enableHiding: false,
      meta: { className: "sticky right-0 z-10 bg-[var(--background)] border-l" },
      cell: ({ row }) => {
        const d = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="h-8 w-8 rounded-xl hover:bg-zinc-100" aria-label="Действия">⋯</button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Действия</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => navigator.clipboard.writeText(String(d.id))}>Скопировать ID</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onView(d.id)}>Открыть</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onFill(d.id)}>Заполнить</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onVersions(d.id)}>Версии</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit(d.id)}>Изменить</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDelete(d)} className="text-red-600 focus:text-red-700">Удалить</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      }
    }
  ];
}
