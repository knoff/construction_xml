import { api } from "@/lib/api";

export async function fetchDocsContent(path?: string | null): Promise<string> {
  const endpoint = path ? "/docs/file" : "/docs/index";
  const response = await api.get<string>(endpoint, {
    params: path ? { path } : undefined,
    responseType: "text",
  });
  return response.data;
}
