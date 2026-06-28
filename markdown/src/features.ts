import type { ComponentRenderer, MarkdownFeatures } from './types';

const inlineWrapperTags = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'span', 'a', 'li']);

export const defaultComponents: Record<string, ComponentRenderer> = {
  Callout: async (props, rawContent, parse, parseInline, features) => {
    const type = props.type || 'note';
    const title = props.title || type.toUpperCase();
    const htmlContent = await parse(rawContent);
    const isCollapsible = 'collapsible' in props && props.collapsible !== 'false';
    const isCollapsed = props.collapsed === 'true';

    const customClass = props.class ? ` ${props.class}` : '';
    const className = `callout callout-${type.toLowerCase()}${customClass}`;
    
    const otherAttrs = Object.entries(props)
      .filter(([k]) => !['value', 'type', 'title', 'collapsible', 'collapsed', 'class'].includes(k))
      .map(([k, v]) => `${k}="${v}"`)
      .join(' ');
    const attrString = otherAttrs ? ` ${otherAttrs}` : '';

    if (isCollapsible) {
      const openAttr = isCollapsed ? '' : ' open';
      return `<details class="${className}"${openAttr}${attrString}><summary class="callout-title">${title}</summary><div class="callout-content">${htmlContent}</div></details>`;
    }

    return `<div class="${className}"${attrString}><div class="callout-title">${title}</div><div class="callout-content">${htmlContent}</div></div>`;
  },
  
  Tabs: async (props, rawContent, parse, parseInline, features) => {
    const content = await parse(rawContent);
    
    const regex = /<div class="tab-panel[^"]*"\s+data-title="([^"]*)"/g;
    const titles: string[] = [];
    let match;
    while ((match = regex.exec(content)) !== null) {
      titles.push(match[1]!);
    }

    if (titles.length === 0) return content;

    const tabButtons = titles.map((title, idx) => {
      const activeClass = idx === 0 ? 'active' : '';
      const clickHandler = `const c = this.closest('.tabs-container'); c.querySelectorAll('.tab-btn').forEach((b, i) => { b.classList.toggle('active', b === this); c.querySelectorAll('.tab-panel')[i].style.display = (b === this) ? 'block' : 'none'; })`;
      return `<button class="tab-btn ${activeClass}" onclick="${clickHandler}">${title}</button>`;
    }).join('');

    let panelIndex = 0;
    const adjustedContent = content.replace(/class="tab-panel([^"]*)"/g, (match, customClasses) => {
      const activeClass = panelIndex === 0 ? ' active' : '';
      const display = panelIndex === 0 ? 'block' : 'none';
      panelIndex++;
      return `class="tab-panel${customClasses}${activeClass}" style="display: ${display};"`;
    });

    const customClass = props.class ? ` ${props.class}` : '';
    const className = `tabs-container${customClass}`;
    const otherAttrs = Object.entries(props)
      .filter(([k]) => !['value', 'class'].includes(k))
      .map(([k, v]) => `${k}="${v}"`)
      .join(' ');
    const attrString = otherAttrs ? ` ${otherAttrs}` : '';

    return `<div class="${className}"${attrString}><div class="tabs-header">${tabButtons}</div><div class="tabs-content">${adjustedContent}</div></div>`;
  },

  Tab: async (props, rawContent, parse, parseInline, features) => {
    const title = props.title || '';
    const content = await parse(rawContent);
    
    const customClass = props.class ? ` ${props.class}` : '';
    const className = `tab-panel${customClass}`;
    const otherAttrs = Object.entries(props)
      .filter(([k]) => !['value', 'title', 'class'].includes(k))
      .map(([k, v]) => `${k}="${v}"`)
      .join(' ');
    const attrString = otherAttrs ? ` ${otherAttrs}` : '';
    
    return `<div class="${className}" data-title="${title}"${attrString}>${content}</div>`;
  },

  Table: async (props, rawContent, parse, parseInline, features) => {
    const content = await parseInline(rawContent);
    const defaultClass = 'auwla-table';
    const customClass = props.class ? ` ${props.class}` : '';
    const mergedClass = `${defaultClass}${customClass}`;
    const attrPairs = Object.entries(props)
      .filter(([k]) => k !== 'value' && k !== 'class')
      .map(([k, v]) => `${k}="${v}"`)
      .join(' ');
    const attrString = attrPairs ? ` ${attrPairs}` : '';
    return `<table class="${mergedClass}"${attrString}>${content}</table>`;
  },

  Row: async (props, rawContent, parse, parseInline, features) => {
    const content = await parseInline(rawContent);
    const attrPairs = Object.entries(props)
      .filter(([k]) => k !== 'value')
      .map(([k, v]) => `${k}="${v}"`)
      .join(' ');
    const attrString = attrPairs ? ` ${attrPairs}` : '';
    return `<tr${attrString}>${content}</tr>`;
  },

  Column: async (props, rawContent, parse, parseInline, features) => {
    const content = await parseInline(rawContent);
    const attrPairs = Object.entries(props)
      .filter(([k]) => k !== 'value')
      .map(([k, v]) => `${k}="${v}"`)
      .join(' ');
    const attrString = attrPairs ? ` ${attrPairs}` : '';
    return `<th${attrString}>${content}</th>`;
  },

  Cell: async (props, rawContent, parse, parseInline, features) => {
    const content = await parseInline(rawContent);
    const attrPairs = Object.entries(props)
      .filter(([k]) => k !== 'value')
      .map(([k, v]) => `${k}="${v}"`)
      .join(' ');
    const attrString = attrPairs ? ` ${attrPairs}` : '';
    return `<td${attrString}>${content}</td>`;
  }
};

function parseAttributes(attrString: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const trimmed = attrString.trim();
  if (!trimmed) return attrs;

  if (trimmed.startsWith('=')) {
    const match = trimmed.match(/^=\s*(?:"(.*?)"|'(.*?)'|([^\s>]+))/);
    if (match) {
      attrs.value = match[1] ?? match[2] ?? match[3] ?? '';
      return attrs;
    }
  }

  const regex = /(\w+)(?:\s*=\s*(?:"(.*?)"|'(.*?)'|([^\s>]+)))?/g;
  let match;
  while ((match = regex.exec(attrString)) !== null) {
    const key = match[1]!;
    const val = match[2] ?? match[3] ?? match[4] ?? 'true';
    attrs[key] = val;
  }
  return attrs;
}

async function renderComponent(
  tagName: string,
  props: Record<string, string>,
  rawContent: string,
  parseFn: (str: string) => Promise<string>,
  parseInlineFn: (str: string) => Promise<string>,
  features: MarkdownFeatures,
  customComponents: Record<string, ComponentRenderer>
): Promise<string> {
  if (customComponents[tagName]) {
    return await customComponents[tagName]!(props, rawContent, parseFn, parseInlineFn, features);
  }

  if (defaultComponents[tagName]) {
    return await defaultComponents[tagName]!(props, rawContent, parseFn, parseInlineFn, features);
  }

  const isInline = inlineWrapperTags.has(tagName.toLowerCase());
  const compiledContent = isInline ? await parseInlineFn(rawContent) : await parseFn(rawContent);

  // Match custom tag heading (e.g. h1, h2, h3, etc.)
  if (isInline && tagName.toLowerCase().startsWith('h') && tagName.length === 2 && !isNaN(Number(tagName.slice(1)))) {
    const depth = tagName.toLowerCase().slice(1);
    const plainText = compiledContent.replace(/<[^>]*>/g, '');
    const id = props.id || plainText
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-');

    const idAttr = `id="${id}"`;
    const classAttr = props.class ? `class="${props.class}"` : '';
    const otherAttrs = Object.entries(props)
      .filter(([k]) => k !== 'value' && k !== 'id' && k !== 'class')
      .map(([k, v]) => `${k}="${v}"`)
      .join(' ');
    const attrString = [idAttr, classAttr, otherAttrs].filter(Boolean).map(s => s.trim()).join(' ');
    const finalAttrString = attrString ? ` ${attrString}` : '';

    if (features?.headerAnchors) {
      return `<h${depth}${finalAttrString}><a href="#${id}" class="header-anchor" aria-hidden="true">#</a>${compiledContent}</h${depth}>`;
    } else {
      return `<h${depth}${finalAttrString}>${compiledContent}</h${depth}>`;
    }
  }

  const attrPairs = Object.entries(props).filter(([k]) => k !== 'value').map(([k, v]) => `${k}="${v}"`).join(' ');
  const attrString = attrPairs ? ` ${attrPairs}` : '';
  
  return `<${tagName}${attrString}>${compiledContent}</${tagName}>`;
}

/**
 * Preprocesses component-like tags (=<TagName>) inside a raw markdown string.
 * Looks up default and custom components, compiles, and injects HTML.
 */
export async function preprocessComponents(
  rawMarkdown: string,
  parseFn: (str: string) => Promise<string>,
  parseInlineFn: (str: string) => Promise<string>,
  features: MarkdownFeatures = {},
  customComponents: Record<string, ComponentRenderer> = {}
): Promise<string> {
  const lines = rawMarkdown.split('\n');
  const result: string[] = [];
  
  type OpenBlock = {
    tagName: string;
    props: Record<string, string>;
    contentLines: string[];
  };
  const stack: OpenBlock[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    // 1. Single-line components (e.g. =<Column>Name=</Column>)
    const singleLineMatch = trimmed.match(/^=<(\w+)([^>]*?)>(.*?)=<\/\1>$/);
    if (singleLineMatch) {
      const tagName = singleLineMatch[1]!;
      const attrString = singleLineMatch[2] || '';
      const innerContent = singleLineMatch[3] || '';
      const props = parseAttributes(attrString);
      const html = await renderComponent(tagName, props, innerContent, parseFn, parseInlineFn, features, customComponents);
      
      if (stack.length > 0) {
        stack[stack.length - 1]!.contentLines.push(html);
      } else {
        result.push(html);
      }
      continue;
    }

    // 2. Self-closing components
    if (trimmed.startsWith('=<') && trimmed.endsWith('/>')) {
      const match = trimmed.match(/^=<(\w+)([^>]*?)\/>$/);
      if (match) {
        const tagName = match[1]!;
        const attrString = match[2] || '';
        const props = parseAttributes(attrString);
        const html = await renderComponent(tagName, props, '', parseFn, parseInlineFn, features, customComponents);
        
        if (stack.length > 0) {
          stack[stack.length - 1]!.contentLines.push(html);
        } else {
          result.push(html);
        }
        continue;
      }
    }

    // 3. Opening component tags
    if (trimmed.startsWith('=<') && !trimmed.startsWith('=</') && trimmed.endsWith('>')) {
      const match = trimmed.match(/^=<(\w+)([^>]*?)>$/);
      if (match) {
        const tagName = match[1]!;
        const attrString = match[2] || '';
        const props = parseAttributes(attrString);
        
        stack.push({
          tagName,
          props,
          contentLines: []
        });
        continue;
      }
    }

    // 4. Closing component tags
    if (trimmed.startsWith('=</') && trimmed.endsWith('>')) {
      const match = trimmed.match(/^=<\/(.*?)>$/);
      if (match) {
        const tagName = match[1]!.trim();
        
        if (stack.length > 0 && stack[stack.length - 1]!.tagName === tagName) {
          const block = stack.pop()!;
          const rawContent = block.contentLines.join('\n');
          const html = await renderComponent(block.tagName, block.props, rawContent, parseFn, parseInlineFn, features, customComponents);
          
          if (stack.length > 0) {
            stack[stack.length - 1]!.contentLines.push(html);
          } else {
            result.push(html);
          }
          continue;
        }
      }
    }

    // 5. Standard line
    if (stack.length > 0) {
      stack[stack.length - 1]!.contentLines.push(line);
    } else {
      result.push(line);
    }
  }

  while (stack.length > 0) {
    const block = stack.pop()!;
    result.push(`=<${block.tagName}>`);
    result.push(block.contentLines.join('\n'));
    result.push(`=</${block.tagName}>`);
  }

  return result.join('\n');
}

function extractRawCode(raw: string): string {
  if (raw.startsWith('```') || raw.startsWith('~~~')) {
    const lines = raw.split('\n');
    return lines.slice(1, -1).join('\n');
  }
  return raw;
}

function parseCodeMeta(langString: string): { lang: string; filename?: string; highlightedLines: Set<number> } {
  const parts = langString.trim().split(/\s+/);
  const lang = parts[0] || '';
  let filename: string | undefined;
  const highlightedLines = new Set<number>();

  for (const part of parts.slice(1)) {
    if (part.startsWith('[') && part.endsWith(']')) {
      filename = part.slice(1, -1);
    } else if (part.startsWith('{') && part.endsWith('}')) {
      const ranges = part.slice(1, -1).split(',');
      for (const range of ranges) {
        if (range.includes('-')) {
          const [startStr, endStr] = range.split('-');
          const start = parseInt(startStr || '0', 10);
          const end = parseInt(endStr || '0', 10);
          if (!isNaN(start) && !isNaN(end)) {
            for (let i = start; i <= end; i++) {
              highlightedLines.add(i);
            }
          }
        } else {
          const val = parseInt(range, 10);
          if (!isNaN(val)) {
            highlightedLines.add(val);
          }
        }
      }
    }
  }

  return { lang, filename, highlightedLines };
}

function injectHighlightedLines(html: string, highlightedLines: Set<number>): string {
  if (highlightedLines.size === 0) return html;

  if (html.includes('class="line"')) {
    let lineIndex = 0;
    return html.replace(/class="line"/g, () => {
      lineIndex++;
      if (highlightedLines.has(lineIndex)) {
        return 'class="line highlighted-line"';
      }
      return 'class="line"';
    });
  }

  const lines = html.split('\n');
  const processed = lines.map((line, idx) => {
    const lineNum = idx + 1;
    if (highlightedLines.has(lineNum)) {
      return `<div class="highlighted-line">${line}</div>`;
    }
    return line;
  });
  return processed.join('\n');
}

/** Custom Marked renderer for a button that copies code snippets to clipboard. */
export function copyCodeButtonRenderer(info: any): string {
  const rawCode = extractRawCode(info.raw);
  const escapedCode = encodeURIComponent(rawCode).replace(/'/g, '%27');
  
  const { lang, filename, highlightedLines } = parseCodeMeta(info.lang ?? '');

  let codeContent = info.text.trim().startsWith('<pre') 
    ? info.text 
    : `<pre><code class="language-${lang}">${info.text}</code></pre>`;

  codeContent = injectHighlightedLines(codeContent, highlightedLines);

  const filenameHeader = filename 
    ? `<div class="code-block-filename">${filename}</div>` 
    : '';

  return `<div class="code-block-wrapper" style="position: relative;">${filenameHeader}<button onclick="navigator.clipboard.writeText(decodeURIComponent('${escapedCode}')); this.textContent = 'Copied!'; setTimeout(() => this.textContent = 'Copy', 2000)" class="copy-code-btn" style="position: absolute; right: 0.5rem; top: ${filename ? '2.5rem' : '0.5rem'}; z-index: 10;">Copy</button>${codeContent}</div>`;
}

/** Custom Marked renderer for adding hoverable anchors pointing to header IDs. */
export function headerAnchorsRenderer(this: any, info: any): string {
  const text = info.text ?? (this.parser ? this.parser.parseInline(info.tokens) : info.raw);
  const depth = info.depth;
  const id = text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-');
  return `<h${depth} id="${id}"><a href="#${id}" class="header-anchor" aria-hidden="true">#</a>${text}</h${depth}>`;
}

