import { useEffect, useMemo, useState } from 'react'
import { useReactTable, getCoreRowModel, ColumnDef, flexRender } from '@tanstack/react-table'
import { api } from '../lib/api'

// Minimal shadcn-style table wrappers (local)
import { Table, THead, TBody, TR, TH, TD } from '../components/ui/table'

type Item = { path: string; name: string }

export default function SchemasList() {
  const [data, setData] = useState<Item[]>([])
  useEffect(() => {
    api.get<Item[]>('/schemas').then(r => setData(r.data))
  }, [])

  const columns = useMemo<ColumnDef<Item>[]>(() => [
    { header: 'Name', accessorKey: 'name' },
    { header: 'Path', accessorKey: 'path' }
  ], [])

  const table = useReactTable({ data, columns, getCoreRowModel: getCoreRowModel() })

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Схемы</h1>
      <Table>
        <THead>
          {table.getHeaderGroups().map(hg => (
            <TR key={hg.id}>
              {hg.headers.map(h => (
                <TH key={h.id}>{flexRender(h.column.columnDef.header, h.getContext())}</TH>
              ))}
            </TR>
          ))}
        </THead>
        <TBody>
          {table.getRowModel().rows.map(r => (
            <TR key={r.id}>
              {r.getVisibleCells().map(c => (
                <TD key={c.id}>{flexRender(c.column.columnDef.cell ?? c.column.columnDef.header, c.getContext())}</TD>
              ))}
            </TR>
          ))}
        </TBody>
      </Table>
    </div>
  )
}
