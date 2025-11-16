import { api } from "@/lib/api";

export type DocsNavigationItem = {
  title: string;
  path?: string;
  match?: string[];
  children?: DocsNavigationItem[];
};

export type DocsNavigation = {
  title: string;
  items: DocsNavigationItem[];
};

export async function fetchDocsNavigation(): Promise<DocsNavigation> {
  const response = await api.get<DocsNavigation>("/docs/navigation");
  return response.data;
}

export async function fetchDocsContent(path?: string | null): Promise<string> {
  const endpoint = path ? "/docs/file" : "/docs/index";
  const response = await api.get<string>(endpoint, {
    params: path ? { path } : undefined,
    responseType: "text",
  });
  return response.data;
}
