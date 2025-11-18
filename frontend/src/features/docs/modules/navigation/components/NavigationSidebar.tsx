import * as React from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";
import type { DocsNavigation, DocsNavigationItem } from "@/features/docs/modules/navigation/core/types";

type NavigationNode = DocsNavigationItem & {
  nodeId: string;
  children?: NavigationNode[];
};

type NavNodeMeta = {
  nodeId: string;
  item: DocsNavigationItem;
  ancestors: string[];
  depth: number;
  hasChildren: boolean;
};

type ActiveAnalysis = {
  resolvedActivePath: string | null;
  activeNodeId: string | null;
  autoExpandedIds: Set<string>;
};

function buildNavigationStructure(items: DocsNavigationItem[]): { nodes: NavigationNode[]; metaList: NavNodeMeta[] } {
  const metaList: NavNodeMeta[] = [];

  const walk = (source: DocsNavigationItem[], prefix: string, ancestors: string[]): NavigationNode[] => {
    return source.map((item, index) => {
      const nodeId = item.path ?? `${prefix}.${index}`;
      const hasChildren = Boolean(item.children?.length);
      metaList.push({ nodeId, item, ancestors, depth: ancestors.length, hasChildren });
      const nextAncestors = [...ancestors, nodeId];
      const children = hasChildren ? walk(item.children ?? [], nodeId, nextAncestors) : undefined;

      return {
        ...item,
        nodeId,
        children,
      };
    });
  };

  const nodes = walk(items, "root", []);

  return { nodes, metaList };
}

function calculateMatchScore(item: DocsNavigationItem, activePath: string): number {
  if (!activePath) {
    return Number.NEGATIVE_INFINITY;
  }

  if (item.path && item.path === activePath) {
    return 1000 + activePath.length;
  }

  let score = Number.NEGATIVE_INFINITY;

  if (item.match?.length) {
    for (const pattern of item.match) {
      if (!pattern) continue;
      if (activePath.startsWith(pattern)) {
        const candidate = 600 + pattern.length;
        if (candidate > score) {
          score = candidate;
        }
      }
    }
  }

  if (item.path) {
    const separatorIndex = item.path.lastIndexOf("/");
    if (separatorIndex >= 0) {
      const baseDir = item.path.slice(0, separatorIndex + 1);
      if (activePath.startsWith(baseDir)) {
        score = Math.max(score, 400 + baseDir.length);
      }
    }
  }

  return score;
}

function analyzeActiveState(activePath: string | null, metaList: NavNodeMeta[]): ActiveAnalysis {
  if (!activePath) {
    return { resolvedActivePath: null, activeNodeId: null, autoExpandedIds: new Set() };
  }

  let bestMatch: { meta: NavNodeMeta | null; score: number } = { meta: null, score: Number.NEGATIVE_INFINITY };

  for (const meta of metaList) {
    const score = calculateMatchScore(meta.item, activePath);
    if (score > bestMatch.score || (score === bestMatch.score && meta.depth > (bestMatch.meta?.depth ?? -1))) {
      bestMatch = { meta, score };
    }
  }

  if (!bestMatch.meta || bestMatch.score === Number.NEGATIVE_INFINITY) {
    return { resolvedActivePath: null, activeNodeId: null, autoExpandedIds: new Set() };
  }

  const autoExpandedIds = new Set<string>();
  for (const ancestorId of bestMatch.meta.ancestors) {
    autoExpandedIds.add(ancestorId);
  }
  if (bestMatch.meta.hasChildren) {
    autoExpandedIds.add(bestMatch.meta.nodeId);
  }

  return {
    resolvedActivePath: bestMatch.meta.item.path ?? null,
    activeNodeId: bestMatch.meta.nodeId,
    autoExpandedIds,
  };
}

type DocsNavigationProps = {
  navigation: DocsNavigation | null;
  activePath: string | null;
  onSelect: (path: string | null) => void;
};

export function DocsNavigationSidebar({ navigation, activePath, onSelect }: DocsNavigationProps) {
  const structure = React.useMemo(() => {
    if (!navigation) {
      return { nodes: [] as NavigationNode[], metaList: [] as NavNodeMeta[] };
    }
    return buildNavigationStructure(navigation.items);
  }, [navigation]);

  const activeAnalysis = React.useMemo(
    () => analyzeActiveState(activePath, structure.metaList),
    [activePath, structure.metaList],
  );

  const [expandedOverrides, setExpandedOverrides] = React.useState<Record<string, boolean>>({});

  React.useEffect(() => {
    setExpandedOverrides({});
  }, [navigation]);

  const getIsExpanded = React.useCallback(
    (nodeId: string, hasChildren: boolean) => {
      if (!hasChildren) {
        return false;
      }

      if (activeAnalysis.autoExpandedIds.has(nodeId)) {
        return true;
      }

      const override = expandedOverrides[nodeId];
      if (override != null) {
        return override;
      }

      return false;
    },
    [expandedOverrides, activeAnalysis.autoExpandedIds],
  );

  const handleToggle = React.useCallback(
    (nodeId: string, hasChildren: boolean, isForced: boolean, currentState: boolean) => {
      if (!hasChildren || isForced) {
        return;
      }
      setExpandedOverrides((prev) => ({
        ...prev,
        [nodeId]: !currentState,
      }));
    },
    [],
  );

  const resolvedActivePath = activeAnalysis.resolvedActivePath ?? activePath;

  return (
    <nav aria-label="Документация" className="space-y-3">
      <div>
        <button
          type="button"
          className={cn(
            "w-full rounded-md px-3 py-2 text-left text-sm transition",
            resolvedActivePath === null ? "bg-slate-900 text-white" : "hover:bg-slate-100 text-slate-700",
          )}
          onClick={() => onSelect(null)}
        >
          Общая информация
        </button>
      </div>
      {navigation ? (
        <div className="space-y-2">
          <div className="px-1 text-xs uppercase tracking-wide text-slate-500">{navigation.title}</div>
          <DocsNavigationList
            nodes={structure.nodes}
            depth={0}
            resolvedActivePath={resolvedActivePath}
            activeNodeId={activeAnalysis.activeNodeId}
            autoExpandedIds={activeAnalysis.autoExpandedIds}
            onSelect={onSelect}
            getIsExpanded={getIsExpanded}
            onToggle={handleToggle}
          />
        </div>
      ) : (
        <div className="rounded border border-dashed border-slate-200 px-3 py-6 text-center text-xs text-slate-500">
          Навигация загружается…
        </div>
      )}
    </nav>
  );
}

type DocsNavigationListProps = {
  nodes: NavigationNode[];
  depth: number;
  resolvedActivePath: string | null;
  activeNodeId: string | null;
  autoExpandedIds: Set<string>;
  onSelect: (path: string | null) => void;
  getIsExpanded: (nodeId: string, hasChildren: boolean) => boolean;
  onToggle: (nodeId: string, hasChildren: boolean, isForced: boolean, currentState: boolean) => void;
};

function DocsNavigationList({
  nodes,
  depth,
  resolvedActivePath,
  activeNodeId,
  autoExpandedIds,
  onSelect,
  getIsExpanded,
  onToggle,
}: DocsNavigationListProps) {
  if (!nodes.length) {
    return null;
  }

  return (
    <ul className={cn("space-y-1", depth > 0 && "border-l border-slate-200 pl-3")}>
      {nodes.map((node) => (
        <DocsNavigationNode
          key={node.nodeId}
          node={node}
          depth={depth}
          resolvedActivePath={resolvedActivePath}
          activeNodeId={activeNodeId}
          autoExpandedIds={autoExpandedIds}
          onSelect={onSelect}
          getIsExpanded={getIsExpanded}
          onToggle={onToggle}
        />
      ))}
    </ul>
  );
}

type DocsNavigationNodeProps = {
  node: NavigationNode;
  depth: number;
  resolvedActivePath: string | null;
  activeNodeId: string | null;
  autoExpandedIds: Set<string>;
  onSelect: (path: string | null) => void;
  getIsExpanded: (nodeId: string, hasChildren: boolean) => boolean;
  onToggle: (nodeId: string, hasChildren: boolean, isForced: boolean, currentState: boolean) => void;
};

function DocsNavigationNode({
  node,
  depth,
  resolvedActivePath,
  activeNodeId,
  autoExpandedIds,
  onSelect,
  getIsExpanded,
  onToggle,
}: DocsNavigationNodeProps) {
  const hasChildren = Boolean(node.children?.length);
  const isExpanded = getIsExpanded(node.nodeId, hasChildren);
  const isForcedExpanded = autoExpandedIds.has(node.nodeId);
  const isActive = node.path != null && node.path === resolvedActivePath;
  const isHighlighted = isActive || node.nodeId === activeNodeId;

  const handleSelect = React.useCallback(() => {
    if (node.path) {
      onSelect(node.path);
    } else if (hasChildren) {
      onToggle(node.nodeId, hasChildren, isForcedExpanded, isExpanded);
    }
  }, [node.path, node.nodeId, hasChildren, onSelect, onToggle, isForcedExpanded, isExpanded]);

  const handleToggle = React.useCallback(() => {
    onToggle(node.nodeId, hasChildren, isForcedExpanded, isExpanded);
  }, [node.nodeId, hasChildren, onToggle, isForcedExpanded, isExpanded]);

  return (
    <li className="space-y-1">
      <div className="flex items-center gap-1">
        {hasChildren ? (
          <button
            type="button"
            onClick={handleToggle}
            className={cn(
              "inline-flex size-6 items-center justify-center rounded-md border border-slate-200 text-slate-500 transition",
              isForcedExpanded ? "cursor-default bg-slate-100" : "hover:bg-slate-100",
            )}
            disabled={isForcedExpanded}
            aria-label={isExpanded ? "Свернуть раздел" : "Развернуть раздел"}
          >
            {isExpanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
          </button>
        ) : (
          <span className="inline-flex size-6" />
        )}
        <button
          type="button"
          onClick={handleSelect}
          className={cn(
            "flex-1 rounded-md px-3 py-1.5 text-left text-sm transition",
            node.path ? "hover:bg-slate-100 text-slate-700" : "text-slate-600",
            isHighlighted && "bg-slate-900 text-white hover:bg-slate-900",
          )}
          disabled={!node.path && !hasChildren}
        >
          <span className="font-medium">{node.title}</span>
        </button>
      </div>
      {hasChildren && isExpanded ? (
        <DocsNavigationList
          nodes={node.children ?? []}
          depth={depth + 1}
          resolvedActivePath={resolvedActivePath}
          activeNodeId={activeNodeId}
          autoExpandedIds={autoExpandedIds}
          onSelect={onSelect}
          getIsExpanded={getIsExpanded}
          onToggle={onToggle}
        />
      ) : null}
    </li>
  );
}
