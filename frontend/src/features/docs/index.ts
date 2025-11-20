import { DocsLayout } from "./modules/layout";
import { DocsNavigationSidebar } from "./modules/navigation/components";
import { DocsViewer } from "./modules/viewer/runtime";

import { defineFeature } from "@/lib/features/manifest";

export const feature = defineFeature({
  id: "docs",
  title: "Документация",
  routes: [
    {
      path: "docs",
      component: () => import("./components/pages/DocsPage"),
    },
  ],
  exports: {
    public: {
      components: {
        DocsLayout,
        DocsNavigationSidebar,
        DocsViewer,
      },
    },
  },
  extensions: [
    {
      target: "app",
      point: "navigation.primary",
      apply(context) {
        if ("registerLink" in context && typeof context.registerLink === "function") {
          context.registerLink({ id: "docs", label: "Документация", to: "/docs", order: 900 });
        }
      },
    },
  ],
});

export { DocsLayout, DocsNavigationSidebar, DocsViewer };
