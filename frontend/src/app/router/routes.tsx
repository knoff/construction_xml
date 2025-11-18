import type { RouteObject } from "react-router-dom";

import { RootLayout } from "@/app/layouts/RootLayout";
import SchemasListPage from "@/features/schemas/pages/SchemasListPage";
import FilesListPage from "@/features/files/pages/FilesListPage";
import ObjectsListPage from "@/features/objects/pages/ObjectsListPage";
import DocumentsListPage from "@/features/documents/pages/DocumentsListPage";
import DocumentFillPage from "@/features/documents/pages/DocumentFillPage";
import DocsPage from "@/features/docs/pages/DocsPage";

export const routes: RouteObject[] = [
  {
    path: "/",
    element: <RootLayout />,
    children: [
      { index: true, element: <SchemasListPage /> },
      { path: "schemas", element: <SchemasListPage /> },
      { path: "files", element: <FilesListPage /> },
      { path: "objects", element: <ObjectsListPage /> },
      { path: "documents", element: <DocumentsListPage /> },
      { path: "documents/:id/fill", element: <DocumentFillPage /> },
      { path: "docs", element: <DocsPage /> },
    ],
  },
];
