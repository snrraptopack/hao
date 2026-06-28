import { createMDConfig, shikiHighlighter } from '../src/index';
import * as fs from 'node:fs';
import * as path from 'node:path';

async function runLiveTest() {
  const currentDir = import.meta.dir;
  const fixturePath = path.resolve(currentDir, 'fixtures', 'sample.md');
  const outputDir = path.resolve(currentDir, 'output');

  console.log(`[live-test] Loading test fixture from: ${fixturePath}`);

  if (!fs.existsSync(fixturePath)) {
    console.error(`[live-test] Error: Fixture sample.md not found!`);
    process.exit(1);
  }

  const rawMarkdown = fs.readFileSync(fixturePath, 'utf-8');

  // Create the engine with all features enabled
  const engine = createMDConfig({
    highlighter: shikiHighlighter({
      theme: 'github-dark',
      langs: ['typescript', 'tsx', 'javascript', 'jsx', 'bash', 'html', 'css', 'rust']
    }),
    features: {
      copyCodeButton: true,
      headerAnchors: true
    }
  });

  console.log('[live-test] Compiling markdown document...');
  const result = await engine.parse(rawMarkdown);

  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const htmlOutputPath = path.resolve(outputDir, 'sample.html');
  const jsonOutputPath = path.resolve(outputDir, 'sample.json');

  // Inject a stylesheet and structural layout in the output HTML so it's readable
  const completeHtml = `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Auwla Markdown Live Output</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.6;
      color: #e2e8f0;
      background-color: #0f172a;
      max-width: 800px;
      margin: 2rem auto;
      padding: 0 1rem;
    }
    h1, h2, h3 {
      color: #f1f5f9;
      border-bottom: 1px solid #334155;
      padding-bottom: 0.3rem;
    }
    .header-anchor {
      color: #64748b;
      text-decoration: none;
      margin-right: 0.5rem;
      opacity: 0.5;
    }
    .header-anchor:hover {
      opacity: 1;
    }
    .callout {
      margin: 1.5rem 0;
      padding: 1rem;
      border-left: 4px solid;
      border-radius: 0.25rem;
      background-color: #1e293b;
    }
    .callout-note { border-left-color: #3b82f6; }
    .callout-tip { border-left-color: #10b981; }
    .callout-warning { border-left-color: #f59e0b; }
    .callout-title, details.callout summary {
      font-weight: 700;
      margin-bottom: 0.5rem;
      font-size: 0.875rem;
      letter-spacing: 0.05em;
      cursor: pointer;
      outline: none;
      user-select: none;
    }
    details.callout summary:hover {
      color: #3b82f6;
    }
    .tabs-container {
      margin: 1.5rem 0;
      border: 1px solid #334155;
      border-radius: 0.5rem;
      background-color: #24292e;
      overflow: hidden;
    }
    .tabs-header {
      display: flex;
      background-color: #1b1f23;
      border-bottom: 1px solid #334155;
    }
    .tab-btn {
      padding: 0.75rem 1.25rem;
      border: none;
      background: none;
      color: #94a3b8;
      font-weight: 500;
      cursor: pointer;
      border-bottom: 2px solid transparent;
      transition: all 0.2s;
    }
    .tab-btn:hover {
      color: #f1f5f9;
      background-color: #24292e;
    }
    .tab-btn.active {
      color: #3b82f6;
      border-bottom-color: #3b82f6;
      background-color: #24292e;
    }
    .tab-panel {
      padding: 0;
    }
    .tab-panel .code-block-wrapper pre {
      margin: 0;
      border: none;
      border-radius: 0;
    }
    .code-block-filename {
      background-color: #1b1f23;
      color: #94a3b8;
      padding: 0.5rem 1rem;
      font-size: 0.8rem;
      font-weight: 500;
      border-bottom: 1px solid #334155;
      font-family: Consolas, Monaco, monospace;
    }
    .highlighted-line {
      background-color: #2e3b4e;
      display: block;
      margin-left: -1rem;
      margin-right: -1rem;
      padding-left: 0.8rem;
      padding-right: 1rem;
      border-left: 4px solid #3b82f6;
    }
    pre {
      background-color: #0f172a;
      padding: 1rem;
      border-radius: 0.375rem;
      overflow-x: auto;
      border: 1px solid #334155;
    }
    code {
      font-family: Consolas, Monaco, "Andale Mono", monospace;
      color: #e2e8f0;
    }
    .copy-code-btn {
      background-color: #334155;
      color: #f1f5f9;
      border: none;
      padding: 0.25rem 0.5rem;
      font-size: 0.75rem;
      border-radius: 0.25rem;
      cursor: pointer;
      transition: background-color 0.2s;
    }
    .copy-code-btn:hover {
      background-color: #475569;
    }
    .auwla-header {
      background-color: #1e293b;
      border: 1px solid #334155;
      padding: 1rem 1.5rem;
      margin-bottom: 2rem;
      border-radius: 0.5rem;
      display: flex;
      align-items: center;
    }
    .auwla-header span {
      font-size: 1.25rem;
      font-weight: 700;
      color: #f8fafc;
    }
    .auwla-table {
      width: 100%;
      border-collapse: collapse;
      margin: 1.5rem 0;
      border: 1px solid #334155;
      border-radius: 0.5rem;
      overflow: hidden;
    }
    .auwla-table th {
      background-color: #1b1f23;
      color: #f1f5f9;
      padding: 0.75rem 1rem;
      font-weight: 600;
      border-bottom: 1px solid #334155;
    }
    .auwla-table td {
      padding: 0.75rem 1rem;
      color: #cbd5e1;
      border-bottom: 1px solid #334155;
    }
    .auwla-table tr:last-child td {
      border-bottom: none;
    }
  </style>
</head>
<body>
  <div style="margin-bottom: 2rem;">
    <a href="./sample.json" target="_blank" style="color: #3b82f6; text-decoration: none;">View Parsed JSON Metadata (TOC & Frontmatter)</a>
  </div>
  
  <!-- Compiled Output -->
  ${result.html}
</body>
</html>
`;

  fs.writeFileSync(htmlOutputPath, completeHtml, 'utf-8');

  const metaOutput = {
    meta: result.meta,
    headings: result.headings
  };
  fs.writeFileSync(jsonOutputPath, JSON.stringify(metaOutput, null, 2), 'utf-8');

  console.log(`[live-test] Success! Compiled files generated successfully:`);
  console.log(`  - HTML output: ${htmlOutputPath}`);
  console.log(`  - JSON metadata: ${jsonOutputPath}`);
}

runLiveTest().catch(console.error);
