import type { RouteObject } from "react-router-dom";
import React from "react";
import { Navigate } from "react-router-dom";

import { RootLayout } from "@/app/layouts/RootLayout";
import { resolvedRootFeatures } from "@/app/feature-registry";
import type { FeatureRoute } from "@/lib/features/manifest";
import { getPrimaryNavigationLinks } from "@/app/navigation";

function createRouteElement(loader: FeatureRoute["component"]) {
  const LazyComponent = React.lazy(loader);
  return (
    <React.Suspense fallback={null}>
      <LazyComponent />
    </React.Suspense>
  );
}

function convertFeatureRoutes(routes: FeatureRoute[] = []): RouteObject[] {
  return routes.map((route) => {
    if (route.index) {
      return {
        index: true,
        element: createRouteElement(route.component),
      } satisfies RouteObject;
    }

    const children = route.children ? convertFeatureRoutes(route.children) : undefined;
    return {
      path: route.path,
      element: createRouteElement(route.component),
      children,
    } satisfies RouteObject;
  });
}

const childrenRoutes = resolvedRootFeatures.flatMap((feature) => convertFeatureRoutes(feature.manifest.routes));

const defaultNavigationTarget = getPrimaryNavigationLinks()[0]?.to;

if (!childrenRoutes.some((route) => route.index) && defaultNavigationTarget) {
  childrenRoutes.unshift({
    index: true,
    element: <Navigate to={defaultNavigationTarget} replace />,
  });
}

export const routes: RouteObject[] = [
  {
    path: "/",
    element: <RootLayout />,
    children: childrenRoutes,
  },
];
