import * as React from "react";
import { cn } from "@/lib/utils";

export function Table(props: React.HTMLAttributes<HTMLTableElement>) {
  return <table className={cn("w-full caption-bottom text-sm", props.className)} {...props} />;
}
export function TableHeader(props: React.HTMLAttributes<HTMLTableSectionElement>) { return <thead {...props} />; }
export function TableBody(props: React.HTMLAttributes<HTMLTableSectionElement>) { return <tbody {...props} />; }
export function TableRow(props: React.HTMLAttributes<HTMLTableRowElement>) { return <tr {...props} />; }
export function TableHead({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return <th className={cn("h-9 px-3 text-left align-middle font-medium text-zinc-600", className)} {...props} />;
}
export function TableCell({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn("p-3 align-middle", className)} {...props} />;
}
