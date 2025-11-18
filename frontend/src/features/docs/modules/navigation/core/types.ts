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
