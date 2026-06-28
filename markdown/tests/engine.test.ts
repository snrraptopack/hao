import { expect, test, describe } from "bun:test";
import { createMDConfig } from "../src/index";

describe("Markdown Engine - Component Tags", () => {
  test("parses markdown to HTML", async () => {
    const engine = createMDConfig();
    const result = await engine.parse("=<h1>Hello=</h1>\n\nWorld");
    expect(result.html.trim()).toBe('<h1 id="hello">Hello</h1><p>World</p>');
  });

  test("extracts `=<Header>` metadata block and strips it from body HTML", async () => {
    const engine = createMDConfig();
    const md = `=<Header>
title: My Title
featured: true
score: 9.8
=</Header>
=<h1>Content=</h1>`;
    const result = await engine.parse(md);
    expect(result.meta).toEqual({
      title: "My Title",
      featured: true,
      score: 9.8,
    });
    expect(result.html.trim()).toBe('<h1 id="content">Content</h1>');
  });

  test("extracts custom heading tags for table of contents", async () => {
    const engine = createMDConfig();
    const md = `=<h1>Title=</h1>\n\nSome text\n\n=<h2>Subtitle=</h2>\n\n=<h3>Detailed Subtitle=</h3>`;
    const result = await engine.parse(md);
    expect(result.headings).toEqual([
      { level: 1, text: "Title", id: "title" },
      { level: 2, text: "Subtitle", id: "subtitle" },
      { level: 3, text: "Detailed Subtitle", id: "detailed-subtitle" },
    ]);
  });

  test("injects copy code button", async () => {
    const engine = createMDConfig({
      features: {
        copyCodeButton: true,
      },
    });
    const result = await engine.parse("```ts\nconst a = 1;\n```");
    expect(result.html).toContain('class="copy-code-btn"');
    expect(result.html).toContain('navigator.clipboard.writeText');
  });

  test("renders default Callout component tag", async () => {
    const engine = createMDConfig();
    const result = await engine.parse("=<Callout type=\"tip\" title=\"Pro Tip\">\nHello Component\n=</Callout>");
    expect(result.html.trim()).toContain('<div class="callout callout-tip">');
    expect(result.html.trim()).toContain('<div class="callout-title">Pro Tip</div>');
    expect(result.html.trim()).toContain('<p>Hello Component</p>');
  });

  test("renders default collapsible Callout component tag using details/summary", async () => {
    const engine = createMDConfig();
    const result = await engine.parse("=<Callout type=\"warning\" title=\"Collapse Me\" collapsible=\"true\">\nCollapsible content\n=</Callout>");
    expect(result.html.trim()).toContain('<details class="callout callout-warning" open>');
    expect(result.html.trim()).toContain('<summary class="callout-title">Collapse Me</summary>');
    expect(result.html.trim()).toContain('<p>Collapsible content</p>');
  });

  test("allows custom components to override default Callout component tag", async () => {
    const engine = createMDConfig({
      components: {
        Callout: (props, rawContent, parse) => {
          return `<section class="custom-user-callout"><h4>${props.title}</h4></section>`;
        }
      }
    });
    const result = await engine.parse("=<Callout title=\"Custom Overridden Callout\">\nContent\n=</Callout>");
    expect(result.html.trim()).toBe('<section class="custom-user-callout"><h4>Custom Overridden Callout</h4></section>');
  });

  test("merges custom class names onto Callout and Tabs components", async () => {
    const engine = createMDConfig();
    const md = `=<Callout type="note" class="my-custom-callout-class">
Hello
=</Callout>
=<Tabs class="my-custom-tabs-class">
  =<Tab title="Tab 1" class="my-custom-tab-panel-class">
    Tab Content
  =</Tab>
=</Tabs>`;
    const result = await engine.parse(md);
    expect(result.html.trim()).toContain('class="callout callout-note my-custom-callout-class"');
    expect(result.html.trim()).toContain('class="tabs-container my-custom-tabs-class"');
    expect(result.html.trim()).toContain('class="tab-panel my-custom-tab-panel-class active"');
  });

  test("forwards custom HTML attributes style and colspan on Table tags", async () => {
    const engine = createMDConfig();
    const md = `=<Table style="color: red;">
  =<Row class="my-row-class">
    =<Column colspan="2">Double Header=</Column>
  =</Row>
=</Table>`;
    const result = await engine.parse(md);
    expect(result.html.trim()).toContain('<table class="auwla-table" style="color: red;">');
    expect(result.html.trim()).toContain('<tr class="my-row-class">');
    expect(result.html.trim()).toContain('<th colspan="2">Double Header</th>');
  });

  test("injects header anchors to custom heading tags", async () => {
    const engine = createMDConfig({
      features: {
        headerAnchors: true,
      },
    });
    const result = await engine.parse("=<h1>Getting Started=</h1>");
    expect(result.html.trim()).toBe('<h1 id="getting-started"><a href="#getting-started" class="header-anchor" aria-hidden="true">#</a>Getting Started</h1>');
  });

  test("renders default Tabs & Tab component tags", async () => {
    const engine = createMDConfig();
    const md = `=<Tabs>
  =<Tab title=\"Panel 1\">
    Content 1
  =</Tab>
  =<Tab title=\"Panel 2\">
    Content 2
  =</Tab>
=</Tabs>`;

    const result = await engine.parse(md);
    expect(result.html.trim()).toContain('<div class="tabs-container">');
    expect(result.html.trim()).toContain('Panel 1');
    expect(result.html.trim()).toContain('Panel 2');
    expect(result.html.trim()).toContain('Content 1');
    expect(result.html.trim()).toContain('Content 2');
  });

  test("renders custom registered component tags", async () => {
    const engine = createMDConfig({
      components: {
        MyCard: (props, rawContent, parse) => {
          return `<div class="card ${props.theme || 'light'}"><h3>${props.title}</h3><div class="body">${rawContent.trim()}</div></div>`;
        }
      }
    });

    const result = await engine.parse("=<MyCard title=\"Super Card\" theme=\"dark\">\nThis is raw content\n=</MyCard>");
    expect(result.html.trim()).toBe('<div class="card dark"><h3>Super Card</h3><div class="body">This is raw content</div></div>');
  });

  test("fallback parsing for unregistered standard HTML tags", async () => {
    const engine = createMDConfig();
    const result = await engine.parse("=<h1 class=\"main-title\">\nHello *World*\n=</h1>");
    // Standard h1 tag will get parsed children inline, avoiding double h1/p nesting
    expect(result.html.trim()).toBe('<h1 id="hello-world" class="main-title">Hello <em>World</em></h1>');
  });

  test("renders built-in Table components", async () => {
    const engine = createMDConfig();
    const md = `=<Table>
  =<Row>
    =<Column>Name=</Column>
    =<Column>Role=</Column>
  =</Row>
  =<Row>
    =<Cell>Alice=</Cell>
    =<Cell>Admin=</Cell>
  =</Row>
=</Table>`;
    const result = await engine.parse(md);
    expect(result.html.trim()).toContain('<table class="auwla-table">');
    expect(result.html.trim()).toContain('<tr><th>Name</th>\n<th>Role</th></tr>');
    expect(result.html.trim()).toContain('<tr><td>Alice</td>\n<td>Admin</td></tr>');
  });
});
