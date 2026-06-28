=<Header>
title: Premium Documentation Guide
author: Amihere Theophilus Junior
version: 1.0.0
draft: false
=</Header>

=<h1 class="main-doc-title">Getting Started with Auwla Markdown=</h1>

Welcome to the premium documentation page compiled dynamically at build time!

Here is a list of features supported by the `@auwla/markdown` engine.

=<h2>Built-in UI Elements=</h2>

=<h3>1. Interactive Callout Panels=</h3>
We support visual callout cards for highlight categories:

=<Callout type="note">
This is a standard informational note block. It is rendered using standard paragraphs and can contain **bold** or *italic* markdown tags.
=</Callout>

=<Callout type="tip" title="Compiler-First Tip" collapsible>
Here is a compiler-first tip! Always remember that wrapping your pages in a single root tag yields highly optimized DOM updates.
=</Callout>

=<Callout type="warning" title="Danger Zone">
Warning! Do not edit compiled output assets directly inside the `dist/` directory, as they are overwritten on each build.
=</Callout>

=<h3>2. Tab Selection Panels=</h3>
Tab sections can toggle between multiple content blocks (e.g. installation options or code syntaxes) using native, zero-dependency client togglers:

=<Tabs>
  =<Tab title="TSX Component">
```tsx [Counter.tsx] {7-9}
import { reactive } from 'auwla';

export default function Counter() {
  const count = reactive(0);
  
  return () => (
    <button onClick={() => count.set(c => c + 1)}>
      Count is: {count.get()}
    </button>
  );
}
```
  =</Tab>

  =<Tab title="TypeScript">
```ts [auth.ts] {2,7}
interface User {
  id: string;
  role: 'admin' | 'user';
}

export function isAdmin(user: User): boolean {
  return user.role === 'admin';
}
```
  =</Tab>

  =<Tab title="Bash CLI">
```bash
bun install @auwla/markdown
```
  =</Tab>
=</Tabs>

=<h2>Component Tables=</h2>

Below is a component-driven Table rendered using `=<Table>` and `=<Row>` tags:

=<Table border="1">
  =<Row>
    =<Column>Framework=</Column>
    =<Column>Size=</Column>
  =</Row>
  =<Row>
    =<Cell>**Auwla**=</Cell>
    =<Cell>~7 kB=</Cell>
  =</Row>
  =<Row>
    =<Cell>**Next.js**=</Cell>
    =<Cell>~100 kB=</Cell>
  =</Row>
=</Table>

=<h2>Stress-Test Scenarios=</h2>

Below we test edge cases, deep nesting, and complex attribute combinations.

=<h3>A. Deeply Nested Component Architecture=</h3>

Here is a collapsible Callout containing a Tab layout, which inside one of its tab panels contains another nested collapsible Callout and a custom Table:

=<Callout type="note" title="Outer Container Callout" collapsible class="outer-class" style="border: 2px dashed #3b82f6; padding: 1.5rem;">
This is the outer callout card. Below is the nested tabs layout:

=<Tabs class="nested-tabs">
  =<Tab title="Overview Panel" class="overview-tab">
#### Overview of Nested Elements

Here is an inner Callout nested inside the tab panel:

=<Callout type="tip" title="Inner Nested Callout" collapsible collapsed="true" class="inner-tip-class" style="background-color: #1e293b; border: 1px solid #10b981;">
This callout is inside a tab panel, which is inside an outer callout.

* Nested list item 1
* Nested list item 2
=</Callout>
  =</Tab>

  =<Tab title="Advanced Table Panel">
Here is a Table nested inside the second tab panel, with custom cell properties:

=<Table class="nested-table" style="color: #cbd5e1; border-color: #475569;">
  =<Row class="header-row">
    =<Column colspan="2" style="background-color: #0f172a;">Nested Table Header (Span 2 Columns)=</Column>
  =</Row>
  =<Row>
    =<Cell class="feature-cell">Feature Name=</Cell>
    =<Cell class="value-cell">**SSG Compilation**=</Cell>
  =</Row>
  =<Row>
    =<Cell>Performance=</Cell>
    =<Cell>`100/100` Lighthouse score=</Cell>
  =</Row>
=</Table>
  =</Tab>
=</Tabs>
=</Callout>

=<h3>B. Self-Closing Tags & Spaces Tolerance=</h3>

We test empty, self-closing, and single-line elements:

=<Callout type="caution" title="Empty Self-Closing Callout" />

=<Table border="1" class="empty-table-test">
  =<Row>
    =<Column>Col 1=</Column>
    =<Column>Col 2=</Column>
  =</Row>
  =<Row>
    =<Cell>=</Cell>
    =<Cell>=</Cell>
  =</Row>
=</Table>

Testing space tolerance and quotes combinations in tag attributes:

=<Callout type = "tip" title = 'Space Tolerant Attribute Matching' collapsible >
This callout tests spaces around equals and quotes.
=</Callout>

---
Enjoy building documentation with Auwla!
