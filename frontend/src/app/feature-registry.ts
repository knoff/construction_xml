import type { FeatureManifest, FeatureExtensionPoint, FeatureExtensionContextParams, FeatureExtensionContext } from "@/lib/features/manifest";
import { defineFeature, resolveFeature, flattenResolvedFeatures } from "@/lib/features/manifest";

import { registerPrimaryNavigationLink } from "./navigation";
import "@/features/docs/bootstrap";

const blockedFeatureFlagGlobs = import.meta.glob<string>("@/features/*/.blocked", {
  eager: true,
  query: "?raw",
  import: "default",
});

function extractFeatureId(path: string) {
  const match = path.match(/\/features\/([^/]+)/);
  return match?.[1];
}

const blockedFeatureIds = new Set(
  Object.keys(blockedFeatureFlagGlobs)
    .map(extractFeatureId)
    .filter((id): id is string => Boolean(id)),
);

const baseManifests: FeatureManifest[] = [
  defineFeature({
    id: "app",
    title: "Базовое приложение",
    extensionPoints: [
      {
        id: "navigation.primary",
        description: "Основное меню навигации",
        allowedTargets: ["*"],
        createContext: (params: FeatureExtensionContextParams) =>
          ({
            ...params,
            registerLink: registerPrimaryNavigationLink,
          } as FeatureExtensionContext & {
            registerLink: typeof registerPrimaryNavigationLink;
          }),
        apply(context, extension) {
          extension.apply(context);
        },
      },
    ],
  }),
];

const featureModuleGlobs = import.meta.glob<{ feature: FeatureManifest }>("@/features/*/index.ts", { eager: true });

const featureManifests: FeatureManifest[] = [
  ...baseManifests,
  ...Object.entries(featureModuleGlobs)
    .filter(([path]) => {
      const featureId = extractFeatureId(path);
      return !featureId || !blockedFeatureIds.has(featureId);
    })
    .map(([, mod]) => defineFeature(mod.feature)),
];

const resolvedRootFeatures = featureManifests.map(resolveFeature);
const resolvedFeatures = flattenResolvedFeatures(resolvedRootFeatures);

function buildExtensionPointIndex() {
  const index = new Map<string, { featureId: string; point: FeatureExtensionPoint }>();

  for (const feature of resolvedFeatures) {
    for (const point of feature.manifest.extensionPoints ?? []) {
      index.set(`${feature.manifest.id}:${point.id}`, { featureId: feature.manifest.id, point });
    }
  }

  return index;
}

function applyExtensions() {
  const extensionPointIndex = buildExtensionPointIndex();

  for (const feature of resolvedFeatures) {
    for (const extension of feature.manifest.extensions ?? []) {
      const target = extensionPointIndex.get(`${extension.target}:${extension.point}`);
      if (!target) continue;

      const targetFeature = resolvedFeatures.find((item) => item.manifest.id === target.featureId);
      if (!targetFeature) continue;

      const allowedTargets = target.point.allowedTargets ?? [targetFeature.manifest.id];
      if (!allowedTargets.includes("*") && !allowedTargets.includes(feature.manifest.id)) {
        continue;
      }

      const contextParams: FeatureExtensionContextParams = {
        target: targetFeature.manifest,
        targetExports: targetFeature.exports,
        source: feature.manifest,
        sourceExports: feature.exports,
        point: target.point,
      };
      const context =
        target.point.createContext?.(contextParams) ??
        (contextParams as FeatureExtensionContext);

      target.point.apply(context, extension);
    }
  }
}

applyExtensions();

export { featureManifests, resolvedRootFeatures, resolvedFeatures };
