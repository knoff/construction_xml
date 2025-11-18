import * as React from "react";
import { cn } from "@/lib/utils";
import type { FieldMeta } from "../adapters/api";

export type FieldTreePanelProps = {
  nodes: FieldMeta[];
  onSelect?: (field: FieldMeta) => void;
  selectedPath?: string | null;
  disabled?: boolean;
};

export function FieldTreePanel({ nodes, onSelect, selectedPath, disabled }: FieldTreePanelProps) {
  const [expanded, setExpanded] = React.useState<Set<string>>(new Set());

  React.useEffect(() => {
    const initial = new Set<string>();
    nodes.forEach((node) => {
      if (node.hasChildren) {
        initial.add(node.path);
      }
    });
    setExpanded(initial);
  }, [nodes]);

  const toggle = React.useCallback((path: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }, []);

  if (!nodes.length) {
    return (
      <div className="rounded border border-dashed border-slate-300 bg-white px-4 py-6 text-center text-sm text-slate-500">
        Доступные поля не найдены.
      </div>
    );
  }

  return (
    <div className="max-h-[360px] overflow-auto rounded border border-slate-200 bg-white p-2">
      <ul className="space-y-1">
        {nodes.map((node) => (
          <FieldTreeNode
            key={node.path}
            node={node}
            depth={0}
            expanded={expanded}
            onToggle={toggle}
            onSelect={onSelect}
            selectedPath={selectedPath}
            disabled={disabled}
          />
        ))}
      </ul>
    </div>
  );
}

type FieldTreeNodeProps = {
  node: FieldMeta;
  depth: number;
  expanded: Set<string>;
  onToggle: (path: string) => void;
  onSelect?: (field: FieldMeta) => void;
  selectedPath?: string | null;
  disabled?: boolean;
};

function FieldTreeNode({ node, depth, expanded, onToggle, onSelect, selectedPath, disabled }: FieldTreeNodeProps) {
  const hasChildren = Boolean(node.children?.length);
  const isExpanded = expanded.has(node.path);
  const isSelected = selectedPath === node.path;
  const indent = depth * 16;

  return (
    <li>
      <div className="flex items-start gap-1" style={{ paddingLeft: indent }}>
        {hasChildren ? (
          <button
            type="button"
            className="mt-[2px] inline-flex h-5 w-5 items-center justify-center rounded border border-slate-200 bg-white text-xs text-slate-500"
            onClick={() => onToggle(node.path)}
            aria-label={isExpanded ? "Свернуть" : "Развернуть"}
          >
            {isExpanded ? "−" : "+"}
          </button>
        ) : (
          <span className="mt-[6px] inline-block h-1.5 w-1.5 rounded-full bg-slate-300" aria-hidden />
        )}
        <button
          type="button"
          className={cn(
            "flex-1 rounded px-2 py-1 text-left text-sm transition",
            node.selectable ? "hover:bg-slate-100" : "text-slate-400",
            isSelected ? "border border-slate-300 bg-slate-100" : "border border-transparent",
          )}
          onClick={() => (node.selectable && !disabled ? onSelect?.(node) : undefined)}
          disabled={!node.selectable || disabled}
        >
          <div className="flex items-center gap-2">
            <span className="font-medium text-slate-800">{node.label}</span>
            {node.valueType ? <CodeBadge>{node.valueType}</CodeBadge> : null}
            {node.isArray ? <Badge>Array</Badge> : null}
            {node.isAttribute ? <Badge>Attr</Badge> : null}
          </div>
          <div className="text-xs text-slate-500">
            <code>{node.path}</code>
          </div>
        </button>
      </div>
      {hasChildren && isExpanded ? (
        <ul className="mt-1 space-y-1">
          {node.children?.map((child) => (
            <FieldTreeNode
              key={child.path}
              node={child}
              depth={depth + 1}
              expanded={expanded}
              onToggle={onToggle}
              onSelect={onSelect}
              selectedPath={selectedPath}
              disabled={disabled}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

type SearchResultsPanelProps = {
  items: FieldMeta[];
  onSelect?: (field: FieldMeta) => void;
  selectedPath?: string | null;
  disabled?: boolean;
};

export function SearchResultsPanel({ items, onSelect, selectedPath, disabled }: SearchResultsPanelProps) {
  if (!items.length) {
    return (
      <div className="rounded border border-dashed border-slate-300 bg-white px-4 py-6 text-center text-sm text-slate-500">
        По вашему запросу ничего не найдено.
      </div>
    );
  }

  return (
    <div className="max-h-[360px] space-y-2 overflow-auto rounded border border-slate-200 bg-white p-2">
      {items.map((item) => {
        const isSelected = selectedPath === item.path;
        return (
          <button
            key={item.path}
            type="button"
            className={cn(
              "w-full rounded border px-3 py-2 text-left text-sm transition",
              "hover:border-slate-300 hover:bg-slate-50",
              isSelected ? "border-slate-400 bg-slate-50" : "border-slate-200 bg-white",
              !item.selectable || disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer",
            )}
            onClick={() => (item.selectable && !disabled ? onSelect?.(item) : undefined)}
            disabled={!item.selectable || disabled}
          >
            <div className="flex items-center gap-2">
              <span className="font-medium text-slate-800">{item.label}</span>
              {item.valueType ? <CodeBadge>{item.valueType}</CodeBadge> : null}
              {item.isArray ? <Badge>Array</Badge> : null}
              {item.isAttribute ? <Badge>Attr</Badge> : null}
            </div>
            <div className="mt-1 text-xs text-slate-500">
              <code>{item.path}</code>
            </div>
            <div className="mt-1 text-xs text-slate-400">{item.breadcrumb}</div>
          </button>
        );
      })}
    </div>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] uppercase tracking-wide text-slate-500">
      {children}
    </span>
  );
}

function CodeBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[11px] font-mono text-slate-600">
      {children}
    </span>
  );
}
