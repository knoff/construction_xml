declare module "react-markdown" {
  import * as React from "react";

  export interface ReactMarkdownProps {
    children?: React.ReactNode;
    remarkPlugins?: any[];
    rehypePlugins?: any[];
    className?: string;
    components?: Record<string, React.ComponentType<any>>;
  }

  const ReactMarkdown: React.FC<ReactMarkdownProps>;

  export default ReactMarkdown;
}

declare module "remark-gfm" {
  import type { Plugin } from "unified";
  const remarkGfm: Plugin;
  export default remarkGfm;
}
