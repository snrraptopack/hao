import { Marked } from 'marked';
import { markedHighlight } from 'marked-highlight';
import type { MarkdownConfig, MarkdownEngine, ParsedMarkdown } from './types';
import { extractFrontmatter } from './frontmatter';
import { extractHeadings } from './headings';
import {
  preprocessComponents,
  copyCodeButtonRenderer,
  headerAnchorsRenderer,
} from './features';

/** Configures and returns an isolated instance of the Markdown parsing engine. */
export function createMDConfig(config: MarkdownConfig = {}): MarkdownEngine {
  const markedInstance = new Marked({
    gfm: true,
  });

  if (config.highlighter) {
    markedInstance.use(
      markedHighlight({
        async: true,
        highlight: async (code, lang) => {
          if (!lang) return code;
          return await (config.highlighter as any)(code, lang);
        },
      })
    );
  }

  // Register built-in features using custom Marked renderers
  const customRenderer: any = {};

  if (config.features?.headerAnchors) {
    customRenderer.heading = headerAnchorsRenderer;
  }

  if (config.features?.copyCodeButton) {
    customRenderer.code = copyCodeButtonRenderer;
  }

  if (Object.keys(customRenderer).length > 0) {
    markedInstance.use({ renderer: customRenderer });
  }

  return {
    parse: async (rawString: string): Promise<ParsedMarkdown> => {
      let { content, meta } = extractFrontmatter(rawString);
      const headings = extractHeadings(content);

      // Preprocess component blocks and custom tags before sending to Marked
      content = await preprocessComponents(
        content,
        async (str) => await markedInstance.parse(str),
        async (str) => await markedInstance.parseInline(str),
        config.features,
        config.components
      );

      const html = await markedInstance.parse(content);

      return {
        html,
        meta,
        headings,
      };
    },
  };
}
