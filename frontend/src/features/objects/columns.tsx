"use client";
import { ColumnDef } from "@tanstack/react-table";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { formatDateTime } from "@/lib/format";

export type ObjectRow = {
  id: number | string;
  name: string;
  obj_uid?: string;
  created_at?: string;
};

export function makeObjectColumns(opts: {
  onView: (id: number | string) => void;
  onEdit: (id: number | string) => void;
  onDelete: (row: ObjectRow) => void;
}): ColumnDef<ObjectRow>[] {
  const { onView, onEdit, onDelete } = opts;
  return [
    { accessorKey: "name", header: "Название" },
    { accessorKey: "obj_uid", header: "UID" },
    { accessorKey: "created_at", header: "Создан",
      cell: ({ row }) => formatDateTime(row.original.created_at as any)
    },
    { accessorKey: "id", header: "ID" },
    {
      id: "actions",
      header: "Действия",
      enableHiding: false,
      meta: { className: "sticky right-0 z-10 bg-[var(--background)] border-l" },
      cell: ({ row }) => {
        const o = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="h-8 w-8 rounded-xl hover:bg-zinc-100" aria-label="Действия">⋯</button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Действия</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => navigator.clipboard.writeText(String(o.obj_uid))}>Скопировать UID</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onView(o.id)}>Открыть</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit(o.id)}>Изменить</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDelete(o)} className="text-red-600 focus:text-red-700">Удалить</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      }
    }
  ];
}
