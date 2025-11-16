import * as React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useSearchParams } from "react-router-dom";
import { ArrowLeft, ArrowRight } from "lucide-react";

import { fetchDocsContent, fetchDocsNavigation, type DocsNavigation } from "../api";
import { DocsNavigationSidebar } from "./DocsNavigation";

const DOCS_BASE_URL = "https://docs.local/";

type LinkClassification =
  | { type: "external"; href: string }
  | { type: "anchor"; hash: string }
  | { type: "internal"; path: string; hash?: string }
  | { type: "unknown" };

type HistoryEntry = {
  path: string | null;
  hash: string | null;
};

function classifyLink(href: string, currentPath: string | null): LinkClassification {
  if (!href) {
    return { type: "unknown" };
  }

  if (href.startsWith("#")) {
    return { type: "anchor", hash: href.slice(1) };
  }

  const lowerHref = href.toLowerCase();
  if (/^[a-z][a-z0-9+.-]*:/.test(lowerHref) || href.startsWith("//")) {
    return { type: "external", href };
  }

  try {
    const base = new URL(currentPath ? currentPath : "README.md", DOCS_BASE_URL);
    const resolved = new URL(href, base);
    const normalizedPath = resolved.pathname.replace(/^\//, "").replace(/^docs\//, "");
    const hash = resolved.hash ? resolved.hash.slice(1) : undefined;

    return { type: "internal", path: normalizedPath, hash };
  } catch (error) {
    return { type: "external", href };
  }
}

export function DocsViewer() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activePath = searchParams.get("path");

  const [navigation, setNavigation] = React.useState<DocsNavigation | null>(null);
  const [navError, setNavError] = React.useState<string | null>(null);
  const [navLoading, setNavLoading] = React.useState(false);

  const [content, setContent] = React.useState<string>("");
  const [contentError, setContentError] = React.useState<string | null>(null);
  const [contentLoading, setContentLoading] = React.useState(false);

  const pendingHashRef = React.useRef<string | null>(null);
  const historyRef = React.useRef<HistoryEntry[]>([{ path: activePath ?? null, hash: null }]);
  const historyInitializedRef = React.useRef(false);
  const [historyIndex, setHistoryIndex] = React.useState(0);

  const loadNavigation = React.useCallback(async () => {
    setNavLoading(true);
    setNavError(null);
    try {
      const data = await fetchDocsNavigation();
      setNavigation(data);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Не удалось загрузить структуру документации";
      setNavError(message);
    } finally {
      setNavLoading(false);
    }
  }, []);

  const loadContent = React.useCallback(
    async (path: string | null) => {
      setContentLoading(true);
      setContentError(null);
      try {
        const markdown = await fetchDocsContent(path);
        setContent(markdown);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Не удалось загрузить документ";
        setContentError(message);
        setContent("");
      } finally {
        setContentLoading(false);
      }
    },
    [],
  );

  React.useEffect(() => {
    void loadNavigation();
  }, [loadNavigation]);

  React.useEffect(() => {
    void loadContent(activePath);
  }, [activePath, loadContent]);

  React.useEffect(() => {
    if (!historyInitializedRef.current) {
      historyRef.current = [{ path: activePath ?? null, hash: null }];
      historyInitializedRef.current = true;
      setHistoryIndex(0);
      return;
    }

    const currentEntry = historyRef.current[historyIndex];
    if (currentEntry && currentEntry.path === activePath) {
      return;
    }

    const foundIndex = historyRef.current.findIndex((entry) => entry.path === activePath);
    if (foundIndex >= 0) {
      setHistoryIndex(foundIndex);
    } else {
      historyRef.current.push({ path: activePath ?? null, hash: null });
      setHistoryIndex(historyRef.current.length - 1);
    }
  }, [activePath, historyIndex]);

  const scrollToHash = React.useCallback((hash: string | null) => {
    if (!hash) {
      window.scrollTo({ top: 0 });
      return;
    }
    const id = decodeURIComponent(hash);
    const target = document.getElementById(id);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  React.useEffect(() => {
    if (!contentLoading) {
      const pendingHash = pendingHashRef.current;
      scrollToHash(pendingHash ?? null);
      pendingHashRef.current = null;
    }
  }, [contentLoading, content, scrollToHash]);

  const pushHistory = React.useCallback((entry: HistoryEntry) => {
    setHistoryIndex((prevIndex) => {
      const base = historyRef.current.slice(0, prevIndex + 1);
      const last = base[base.length - 1];
      if (last && last.path === entry.path && last.hash === entry.hash) {
        historyRef.current = base;
        return base.length - 1;
      }
      base.push(entry);
      historyRef.current = base;
      return base.length - 1;
    });
  }, []);

  const navigateToDoc = React.useCallback(
    (nextPath: string | null, hash?: string | null, options?: { recordHistory?: boolean }) => {
      const recordHistory = options?.recordHistory ?? true;
      const normalizedHash = hash ?? null;

      if (recordHistory) {
        pushHistory({ path: nextPath, hash: normalizedHash });
      }

      if (nextPath && nextPath !== activePath) {
        pendingHashRef.current = normalizedHash;
        setSearchParams({ path: nextPath });
        return;
      }

      if (!nextPath) {
        setSearchParams({});
      }

      if (normalizedHash) {
        scrollToHash(normalizedHash);
      } else {
        window.scrollTo({ top: 0 });
      }
    },
    [activePath, pushHistory, scrollToHash, setSearchParams],
  );

  const handleSelect = React.useCallback(
    (nextPath: string | null) => {
      navigateToDoc(nextPath ?? null);
    },
    [navigateToDoc],
  );

  const canGoBack = historyIndex > 0;
  const canGoForward = historyIndex < historyRef.current.length - 1;

  const handleBack = React.useCallback(() => {
    if (!canGoBack) {
      return;
    }
    const targetIndex = historyIndex - 1;
    const entry = historyRef.current[targetIndex];
    setHistoryIndex(targetIndex);
    navigateToDoc(entry.path, entry.hash ?? null, { recordHistory: false });
  }, [canGoBack, historyIndex, navigateToDoc]);

  const handleForward = React.useCallback(() => {
    if (!canGoForward) {
      return;
    }
    const targetIndex = historyIndex + 1;
    const entry = historyRef.current[targetIndex];
    setHistoryIndex(targetIndex);
    navigateToDoc(entry.path, entry.hash ?? null, { recordHistory: false });
  }, [canGoForward, historyIndex, navigateToDoc]);

  const linkBaseClass = "inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm text-slate-700 hover:bg-slate-100 transition";

  const markdownComponents = React.useMemo(
    () => ({
      a({ href, children, ...props }: { href?: string; children?: React.ReactNode }) {
        if (!href) {
          return <span {...props}>{children}</span>;
        }

        const classification = classifyLink(href, activePath);

        if (classification.type === "external") {
          return (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className={`${linkBaseClass} text-blue-700 hover:text-blue-800`}
              {...props}
            >
              <span>{children}</span>
              <span aria-hidden="true" className="text-xs">↗</span>
            </a>
          );
        }

        if (classification.type === "anchor") {
          return (
            <a
              href={`#${classification.hash}`}
              onClick={(event) => {
                event.preventDefault();
                navigateToDoc(activePath, classification.hash);
              }}
              className={linkBaseClass}
              {...props}
            >
              {children}
            </a>
          );
        }

        if (classification.type === "internal") {
          return (
            <a
              href={href}
              onClick={(event) => {
                event.preventDefault();
                navigateToDoc(classification.path || null, classification.hash ?? null);
              }}
              className={linkBaseClass}
              {...props}
            >
              {children}
            </a>
          );
        }

        return (
          <a href={href} className={linkBaseClass} {...props}>
            {children}
          </a>
        );
      },
    }),
    [activePath, linkBaseClass, navigateToDoc],
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      <aside className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        {navLoading ? (
          <div className="text-center text-xs text-slate-500">Загрузка…</div>
        ) : navError ? (
          <div className="space-y-2 text-xs text-red-600">
            <div>Не удалось загрузить навигацию.</div>
            <button
              type="button"
              className="rounded border border-slate-300 px-2 py-1 text-xs"
              onClick={() => void loadNavigation()}
            >
              Повторить
            </button>
          </div>
        ) : (
          <DocsNavigationSidebar navigation={navigation} activePath={activePath} onSelect={handleSelect} />
        )}
      </aside>

      <article className="space-y-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleBack}
            disabled={!canGoBack}
            className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-sm text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Назад"
          >
            <ArrowLeft className="size-4" />
          </button>
          <button
            type="button"
            onClick={handleForward}
            disabled={!canGoForward}
            className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-sm text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Вперёд"
          >
            <ArrowRight className="size-4" />
          </button>
        </div>
        {contentLoading ? (
          <div className="rounded border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-500">
            Загрузка документа…
          </div>
        ) : contentError ? (
          <div className="space-y-3 rounded border border-red-200 bg-red-50 px-4 py-6 text-sm text-red-700">
            <div className="font-semibold">Ошибка загрузки документа</div>
            <div>{contentError}</div>
            <button
              type="button"
              className="rounded border border-red-300 px-3 py-1 text-xs text-red-700"
              onClick={() => void loadContent(activePath)}
            >
              Повторить
            </button>
          </div>
        ) : content ? (
          <div className="prose prose-slate max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
              {content}
            </ReactMarkdown>
          </div>
        ) : (
          <div className="rounded border border-slate-200 bg-white px-4 py-6 text-sm text-slate-500">
            Документ не выбран.
          </div>
        )}
      </article>
    </div>
  );
}
