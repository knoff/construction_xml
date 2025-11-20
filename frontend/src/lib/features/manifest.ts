import type { ComponentType } from "react";

export interface FeatureRoute {
  path?: string;
  index?: boolean;
  component: () => Promise<{ default: ComponentType<any> }>;
  children?: FeatureRoute[];
}

export interface FeatureExportsGroup {
  pages?: Record<string, ComponentType<any>>;
  components?: Record<string, ComponentType<any>>;
  runtime?: Record<string, unknown>;
  adapters?: Record<string, unknown>;
  utils?: Record<string, unknown>;
}

export interface FeatureExports {
  public?: FeatureExportsGroup;
  internal?: FeatureExportsGroup;
}

export interface FeatureRuntimeExports {
  public: FeatureExportsGroup;
  internal: FeatureExportsGroup;
}

export interface FeatureExtensionContextParams {
  target: FeatureManifest;
  source: FeatureManifest;
  point: FeatureExtensionPoint;
  targetExports: FeatureRuntimeExports;
  sourceExports: FeatureRuntimeExports;
}

export interface FeatureExtensionContext extends FeatureExtensionContextParams {
  [key: string]: unknown;
}

export interface FeatureExtensionPoint {
  id: string;
  description?: string;
  allowedTargets?: string[];
  createContext?: (params: FeatureExtensionContextParams) => FeatureExtensionContext;
  apply(context: FeatureExtensionContext, extension: FeatureExtension): void;
}

export interface FeatureExtension {
  target: string;
  point: string;
  apply(context: FeatureExtensionContext): void;
}

export interface FeatureManifest {
  id: string;
  title?: string;
  routes?: FeatureRoute[];
  exports?: FeatureExports;
  extensionPoints?: FeatureExtensionPoint[];
  extensions?: FeatureExtension[];
  modules?: FeatureManifest[];
}

const EXPORT_KEYS: (keyof FeatureExportsGroup)[] = ["pages", "components", "runtime", "adapters", "utils"];

export function createExportsGroup(initial?: FeatureExportsGroup): FeatureExportsGroup {
  const group: FeatureExportsGroup = {};
  for (const key of EXPORT_KEYS) {
    const value = initial?.[key];
    if (value) {
      switch (key) {
        case "pages":
        case "components":
          group[key] = { ...(value as Record<string, ComponentType<any>>) };
          break;
        case "runtime":
        case "adapters":
        case "utils":
          group[key] = { ...(value as Record<string, unknown>) };
          break;
      }
    }
  }
  return group;
}

export function mergeExportsGroup(target: FeatureExportsGroup, source?: FeatureExportsGroup): FeatureExportsGroup {
  if (!source) {
    return target;
  }

  for (const key of EXPORT_KEYS) {
    const value = source[key];
    if (value) {
      switch (key) {
        case "pages":
        case "components": {
          const bucket = (target[key] ??= {} as Record<string, ComponentType<any>>);
          Object.assign(bucket, value as Record<string, ComponentType<any>>);
          break;
        }
        case "runtime":
        case "adapters":
        case "utils": {
          const bucket = (target[key] ??= {} as Record<string, unknown>);
          Object.assign(bucket, value as Record<string, unknown>);
          break;
        }
      }
    }
  }

  return target;
}

export function createRuntimeExports(initial?: FeatureExports): FeatureRuntimeExports {
  return {
    public: createExportsGroup(initial?.public),
    internal: createExportsGroup(initial?.internal),
  };
}

export function defineFeature(manifest: FeatureManifest): FeatureManifest {
  const extensionPoints = (manifest.extensionPoints ?? []).map((point) => {
    const allowedTargets = point.allowedTargets ?? [manifest.id];
    const createContext =
      point.createContext ??
      ((params: FeatureExtensionContextParams) => ({ ...params } as FeatureExtensionContext));
    const apply =
      point.apply ??
      ((context: FeatureExtensionContext, extension: FeatureExtension) => {
        extension.apply(context);
      });

    return {
      ...point,
      allowedTargets,
      createContext,
      apply,
    } satisfies FeatureExtensionPoint;
  });

  return {
    ...manifest,
    exports: manifest.exports ?? {},
    extensionPoints,
    extensions: manifest.extensions ?? [],
    modules: manifest.modules?.map(defineFeature) ?? [],
  };
}

export interface ResolvedFeature {
  manifest: FeatureManifest;
  exports: FeatureRuntimeExports;
  modules: ResolvedFeature[];
}

export function resolveFeature(manifest: FeatureManifest): ResolvedFeature {
  const exports = createRuntimeExports(manifest.exports);
  const modules = (manifest.modules ?? []).map(resolveFeature);

  return { manifest, exports, modules };
}

export function flattenFeatures(features: FeatureManifest[]): FeatureManifest[] {
  const result: FeatureManifest[] = [];

  const visit = (feature: FeatureManifest) => {
    result.push(feature);
    feature.modules?.forEach(visit);
  };

  features.forEach(visit);

  return result;
}

export function flattenResolvedFeatures(features: ResolvedFeature[]): ResolvedFeature[] {
  const result: ResolvedFeature[] = [];

  const visit = (feature: ResolvedFeature) => {
    result.push(feature);
    feature.modules.forEach(visit);
  };

  features.forEach(visit);

  return result;
}
