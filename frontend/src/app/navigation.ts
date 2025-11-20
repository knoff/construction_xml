import React from "react";

export interface NavigationLink {
  id: string;
  label: string;
  to: string;
  order?: number;
}

const primaryNavigation = new Map<string, NavigationLink>();
const listeners = new Set<() => void>();
let snapshotVersion = 0;
let cachedSnapshot: NavigationLink[] = [];
let cachedVersion = -1;

export function registerPrimaryNavigationLink(link: NavigationLink) {
  primaryNavigation.set(link.id, link);
  snapshotVersion += 1;
  listeners.forEach((listener) => listener());
}

function buildSortedLinks(): NavigationLink[] {
  return Array.from(primaryNavigation.values()).sort((a, b) => {
    const orderA = a.order ?? 0;
    const orderB = b.order ?? 0;
    if (orderA !== orderB) return orderA - orderB;
    return a.label.localeCompare(b.label, "ru");
  });
}

function getNavigationSnapshot() {
  if (cachedVersion !== snapshotVersion) {
    cachedSnapshot = buildSortedLinks();
    cachedVersion = snapshotVersion;
  }

  return cachedSnapshot;
}

export function getPrimaryNavigationLinks(): NavigationLink[] {
  return buildSortedLinks();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function usePrimaryNavigationLinks() {
  return React.useSyncExternalStore(subscribe, getNavigationSnapshot, getNavigationSnapshot);
}
