import { api } from "@/lib/api";

import type { DocsNavigation } from "@/features/docs/modules/navigation/core/types";

export type { DocsNavigation, DocsNavigationItem } from "@/features/docs/modules/navigation/core/types";

export async function fetchDocsNavigation(): Promise<DocsNavigation> {
  const response = await api.get<DocsNavigation>("/docs/navigation");
  return response.data;
}
