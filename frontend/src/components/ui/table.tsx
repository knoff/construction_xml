import { HTMLAttributes } from 'react'
export const Table = (p: HTMLAttributes<HTMLTableElement>) => <table className="w-full border" {...p} />
export const THead = (p: HTMLAttributes<HTMLTableSectionElement>) => <thead className="bg-gray-50" {...p} />
export const TBody = (p: HTMLAttributes<HTMLTableSectionElement>) => <tbody {...p} />
export const TR = (p: HTMLAttributes<HTMLTableRowElement>) => <tr className="[&>*]:p-2 border-b" {...p} />
export const TH = (p: HTMLAttributes<HTMLTableCellElement>) => <th className="text-left font-medium" {...p} />
export const TD = (p: HTMLAttributes<HTMLTableCellElement>) => <td {...p} />
