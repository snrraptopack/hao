export type HighlighterAdapter = (code: string, language: string) => Promise<string> | string;

export interface MarkdownFeatures {
  copyCodeButton?: boolean;
  tabs?: boolean;
  callouts?: boolean;
  headerAnchors?: boolean;
}

export type ComponentRenderer = (
  props: Record<string, string>,
  rawContent: string,
  parseFn: (str: string) => Promise<string>,
  parseInlineFn: (str: string) => Promise<string>,
  features?: MarkdownFeatures
) => Promise<string> | string;

export interface MarkdownConfig {
  highlighter?: HighlighterAdapter | false;
  features?: MarkdownFeatures;
  components?: Record<string, ComponentRenderer>;
}

export interface ParsedMarkdown {
  html: string;
  meta: Record<string, any>;
  headings: Array<{ level: number; text: string; id: string }>;
}

export interface MarkdownEngine {
  parse: (rawString: string) => Promise<ParsedMarkdown>;
}
