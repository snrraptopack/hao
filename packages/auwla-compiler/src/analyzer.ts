import { parse as parseHtml } from 'node-html-parser';
import type { HTMLElement } from 'node-html-parser';

export interface TemplateNode {
  tag: string;
  attributes: Record<string, string>;
  events: Record<string, string>; // event name -> method name
  reactiveAttrs: Record<string, string>; // attr name -> ref name
  text?: string;
  children: TemplateNode[];
  isReactive: boolean;
  // Control structures
  ifCondition?: string; // {{#if condition}}
  eachItems?: string;   // {{#each items}}
  eachItemName?: string; // variable name for each item
}

/**
 * Analyzes the template HTML and finds:
 * - @event attributes (e.g., @click="increment")
 * - :reactive attributes (e.g., :value="email")
 * - {{}} reactive text bindings
 */
// DEPRECATED: This older template analyzer is superseded by the Babel-based
// `jsx-analyzer.ts` and the `auwla-parser.ts` pipeline. Prefer the newer
// pipeline for robust handling of JSX/TS constructs.
export function analyzeTemplate(templateHtml: string): TemplateNode[] {
  const root = parseHtml(templateHtml);
  
  return root.childNodes
    .filter(node => node.nodeType === 1) // Element nodes only
    .map(node => analyzeNode(node as HTMLElement));
}

function analyzeNode(element: HTMLElement): TemplateNode {
  const node: TemplateNode = {
    tag: element.tagName.toLowerCase(),
    attributes: {},
    events: {},
    reactiveAttrs: {},
    children: [],
    isReactive: false
  };
  
  // Parse attributes
  const attrs = element.attributes || {};
  
  for (const [key, value] of Object.entries(attrs)) {
    if (key.startsWith('@')) {
      // Could be event or control structure
      const directive = key.slice(1); // Remove @
      
      if (directive === 'if') {
        // Conditional: @if="condition"
        node.ifCondition = value;
        node.isReactive = true;
      } else if (directive === 'each') {
        // Loop: @each="items as item"
        const match = value.match(/(\w+)\s+as\s+(\w+)/);
        if (match) {
          node.eachItems = match[1];
          node.eachItemName = match[2];
          node.isReactive = true;
        }
      } else {
        // Event handler: @click="methodName"
        node.events[directive] = value;
      }
    } else if (key.startsWith(':')) {
      // Reactive attribute: :value="refName"
      const attrName = key.slice(1); // Remove :
      node.reactiveAttrs[attrName] = value;
      node.isReactive = true;
    } else {
      // Regular attribute
      node.attributes[key] = value;
    }
  }
  
  // Get direct text content (only if no child elements)
  let textContent = '';
  const hasChildElements = element.childNodes.some(child => child.nodeType === 1);
  
  if (!hasChildElements) {
    // Try multiple approaches to get text content
    if (element.text) {
      textContent = element.text.trim();
    } else if (element.rawText) {
      textContent = element.rawText.trim();
    } else if (element.textContent) {
      textContent = element.textContent.trim();
    } else {
      // Manually extract text from childNodes
      const textNodes = element.childNodes.filter(child => child.nodeType === 3);
      if (textNodes.length > 0) {
        textContent = textNodes.map(node => node.text || '').join('').trim();
      }
    }
  }
  
  // Check for reactive or static text content
  if (textContent && (textContent.includes('{{') || textContent.includes('{'))) {
    node.text = textContent;
    if (textContent.includes('{{')) {
      node.isReactive = true;
    }
  } else if (textContent) {
    // Even plain text should be captured
    node.text = textContent;
  }
  
  // Process children (only element nodes)
  node.children = element.childNodes
    .filter(child => child.nodeType === 1)
    .map(child => analyzeNode(child as HTMLElement));
  
  return node;
}
