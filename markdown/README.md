# `@auwla/markdown`

A zero-dependency, type-safe Markdown compilation engine with custom component tags, code-block filename headers, line-highlighting, and interactive tabs. Designed for premium developer documentation and Static Site Generation (SSG).

> [!NOTE]
> **Full Standard Markdown Support:** `@auwla/markdown` is completely backward-compatible. It supports all default, standard Markdown documents (fences, headings, lists, bold text) out of the box. Our custom tag-based component syntax (`=<TagName>`) is designed as a completely **optional layer** to improve markup readability and provide advanced UI customizations (like tabs, collapsible callouts, and customized tables).

---

## 🚀 Key Features

*   **Visual Component Tags (`=<TagName>`):** Dynamic components registry with built-in or custom elements.
*   **Header Metadata:** `=<Header>` block strips frontmatter configuration from HTML body automatically.
*   **Collapsible Callouts:** Native `<details>`/`<summary>` card blocks.
*   **Tag-Based Tab Panels:** Multi-tab toggle sections using `=<Tabs>` and `=<Tab>`.
*   **Zero Client-Side JS Overhead:** Interactive UI elements use tiny, inline, vanilla handlers.
*   **Code Blocks Meta:** Support filename badges `[Counter.tsx]` and line range highlights `{7-9}`.
*   **Header Anchors:** Self-linking `#` anchors generated for both markdown and tag-based headings.

---

## 📦 Getting Started

### 1. Install the Package

```bash
bun add @auwla/markdown
# or npm install @auwla/markdown
```

### 2. Initialize the Compiler Configuration

Create a markdown parser configuration file:

```typescript
// src/markdown.config.ts
import { createMDConfig, shikiHighlighter } from '@auwla/markdown';

export const mdParser = createMDConfig({
  // Pluggable highlighter adapter (runs at compile-time)
  highlighter: shikiHighlighter({
    theme: 'github-dark',
    langs: ['typescript', 'tsx', 'javascript', 'jsx', 'bash', 'html', 'css']
  }),

  // Toggle built-in features
  features: {
    copyCodeButton: true,  // Adds interactive "Copy" button to code blocks
    headerAnchors: true    // Appends self-linking hover anchors (#) to headings
  },

  // Register custom component tags
  components: {
    MyCard: (props, rawContent, parse) => `
      <div class="card ${props.theme || 'light'}">
        <h3>${props.title}</h3>
        <div class="body">${parse(rawContent)}</div>
      </div>
    `
  }
});
```

---

## 📑 `=<Header>` Metadata Syntax

Traditional frontmatter YAML markers (`---`) are replaced by the `=<Header>` block placed at the **very top of the file**:

```markdown
=<Header>
title: Premium Documentation Guide
author: Amihere Theophilus Junior
version: 1.0.0
draft: false
=</Header>
```

### Metadata Features:
*   **Parsing & Extraction:** The parsed fields are returned programmatically under the `meta` key.
*   **HTML Stripping:** The entire `=<Header>` block is stripped completely from the returned HTML body so it never renders inside page content.

---

## 🧩 Built-in Component Tags

All custom tags start with `=<` and close with `=</TagName>` or are self-closing `/>`.

### Customization & Attribute Forwarding:
Every built-in tag supports **easy CSS class targeting** and **raw HTML attribute forwarding**:
*   **Class name merging:** If you pass `class="..."` on any tag, the custom class names are automatically appended to the component's default class name (e.g. `<div class="callout callout-note my-custom-class">`).
*   **HTML attribute forwarding:** Any custom HTML properties (like `style="..."`, `colspan="..."`, `rowspan="..."`) passed to a component are directly forwarded to the compiled HTML tag (e.g. `<table class="auwla-table" style="color: red;">`).

---

### 1. `=<Callout>`
Displays highlighted message blocks.

*   **Attributes:**
    *   `type`: Modifies color theme border. Supported: `note`, `tip`, `important`, `warning`, `caution`. (Default: `note`).
    *   `title`: Overrides default uppercase header text.
    *   `collapsible`: Boolean or presence marker (`collapsible`, `collapsible="true"`). If present, compiles to native interactive `<details>` and `<summary>` elements.
    *   `collapsed`: Boolean (`"true"` / `"false"`). If collapsible, sets whether it is closed by default.
    *   `class`: Custom classes merged onto the element wrapper.
    *   *Additional attributes:* Any other attribute (e.g. `style="..."`) is forwarded directly.

```markdown
/* Simple Standard Callout */
=<Callout type="note" title="Useful Note">
This is a standard callout.
=</Callout>

/* Interactive Collapsible Callout */
=<Callout type="tip" title="Advanced Tip" collapsible>
Here is some detailed compilation info that is collapsed by default.
=</Callout>
```

---

### 2. `=<Tabs>` and `=<Tab>`
Renders selection tabs with zero-dependency toggle buttons.

*   **`=<Tabs>`** (Parent Container): Parses nested panels and binds click state handlers. Supports `class` and `style` forwarding.
*   **`=<Tab>`** (Panel):
    *   `title`: The label displayed on the tab button (required).
    *   Supports `class` and `style` forwarding (e.g., custom tab panels).

```markdown
=<Tabs class="my-custom-tabs">
  =<Tab title="TSX Component" class="first-panel">
```tsx [Counter.tsx]
import { reactive } from 'auwla';
export default function Counter() { ... }
```
  =</Tab>

  =<Tab title="Bash CLI">
```bash
bun install @auwla/markdown
```
  =</Tab>
=</Tabs>
```

---

### 3. Custom Tables (`=<Table>`, `=<Row>`, `=<Column>`, `=<Cell>`)
Structural tag-based table elements.

*   **`=<Table>`** (Wrapper): Accepts table attributes (like `border="1"`, `class`, or `style`).
*   **`=<Row>`** (Row): Compiles to `<tr>`. Supports class/style forwarding.
*   **`=<Column>`** (Header Cell): Compiles to `<th>`. Supports `align` (`"left"`, `"center"`, `"right"`), `colspan`, `rowspan`, class, and style.
*   **`=<Cell>`** (Data Cell): Compiles to `<td>`. Supports `align` (`"left"`, `"center"`, `"right"`), `colspan`, `rowspan`, class, and style.

```markdown
=<Table style="color: red;">
  =<Row class="header-row">
    =<Column align="left" colspan="2">Framework Details=</Column>
  </Row>
  =<Row>
    =<Cell align="left">**Auwla**=</Cell>
    =<Cell align="center">~7 kB=</Cell>
  </Row>
</Table>
```

---

### 4. Custom Headings (`=<h1>` through `=<h6>`)
Component-driven headings:
*   **Auto-generated IDs:** Heading text is slugified to generate `id="..."` attributes automatically.
*   **Custom IDs:** Custom identifiers are preserved if defined explicitly on the tag (e.g. `=<h2 id="custom-anchor">`).
*   **Hover Anchors:** Self-linking `#` anchors are injected inside heading elements when `features.headerAnchors` is enabled.

```markdown
=<h1>Getting Started=</h1>
```

---

### 5. Fallback Wrappers (Lowercase Tags)
Standard lowercase HTML tag markers (e.g., `=<p>`, `=<span>`, `=<a>`) can be written directly:
*   **No Double Nesting:** Children inside standard inline wrapper tags (like `p`, `span`, `h1`-`h6`, `li`, `a`) are compiled in **inline mode** to prevent double-block wrapping (e.g., `<p><p>...</p></p>`).

---

## 📝 Code Block Metadata

Annotations are parsed directly from the language fence:
*   **Filename badge:** Add square brackets `[filename.ext]` to render a filename tab header above the code block.
*   **Line Highlights:** Add curly braces `{range}` (e.g. `{1-3,5}`) to highlight specific lines.

```typescript
```tsx [Counter.tsx] {3,5-7}
import { reactive } from 'auwla';
// This line is highlighted
const a = 1;
// These lines are highlighted
const b = 2;
const c = 3;
```
```

---

## 💅 Styling Class Schema

Styling class names generated in the HTML output:

| Component | Class Name | Description |
| :--- | :--- | :--- |
| **Callout** | `.auwla-callout` | Main card element. |
| **Callout Type** | `.auwla-callout-note` | Modifier class based on `type="..."`. |
| **Callout Title** | `.auwla-callout-title` | Title bar elements. |
| **Callout Content** | `.auwla-callout-content` | Wrapped markdown content body. |
| **Tabs Wrapper** | `.auwla-tabs-container` | Main tab selector wrapper. |
| **Tabs Header** | `.auwla-tabs-header` | Row containing tab buttons. |
| **Tab Button** | `.auwla-tab-btn` | Interactive tab toggle button. |
| **Active Tab** | `.auwla-tab-btn.active` | Target tab state. |
| **Tab Panel** | `.auwla-tab-panel` | Display body container. |
| **Table** | `.auwla-table` | Global table selector class name. |
| **Header Anchor** | `.header-anchor` | Hoverable link symbol pointing to heading IDs. |
| **Copy Button** | `.copy-code-btn` | Interactive absolute-positioned copy button. |
| **Code Wrapper** | `.code-block-wrapper` | Relative div wrapper surrounding pre/code blocks. |
| **Code Filename** | `.code-block-filename` | Header text element showing the filename. |
| **Line Highlight** | `.highlighted-line` | Highlighted code line helper class. |

---

## 🛠️ Framework Integration Examples

`@auwla/markdown` compiles down to plain HTML and metadata objects, making it compatible with any modern JS framework.

### 1. Vanilla JS / Node / Bun

```typescript
import { mdParser } from './markdown.config';

const rawMarkdown = `
=<Header>
title: Standalone Markdown Engine
=</Header>
# Welcome
`;

const { html, meta, headings } = await mdParser.parse(rawMarkdown);
console.log(meta.title); // "Standalone Markdown Engine"
console.log(html);       // "<h1>Welcome</h1>"
```

### 2. Svelte / React / Solid (Dynamic Render)

Pass the generated HTML string directly to your framework's raw HTML injector:

```tsx
// React / Solid
export function DocView({ html }) {
  return <article dangerouslySetInnerHTML={{ __html: html }} />;
}
```

```svelte
<!-- Svelte -->
<article>
  {@html html}
</article>
```

### 3. Static Site Generation (SSG) in Auwla

```tsx
// src/pages/docs/[slug].tsx
import { getRouted, type RouteContext } from 'auwla/router';
import { mdParser } from '../../markdown.config';

export const config = {
  renderMode: 'ssg',
  async generatePaths() {
    return [{ slug: 'introduction' }, { slug: 'installation' }];
  }
};

export async function routed(ctx: RouteContext<'/docs/:slug'>) {
  const rawMarkdown = await loadMarkdownFile(ctx.params.slug);
  const { html, meta, headings } = await mdParser.parse(rawMarkdown);
  return { html, meta, headings };
}

export default function DocPage() {
  const data = getRouted(routed)?.value;
  if (!data) return () => <div>Loading...</div>;

  return () => (
    <div class="docs-layout">
      <h1>{data.meta.title}</h1>
      <article dangerouslySetInnerHTML={{ __html: data.html }} />
    </div>
  );
}
```
