/**
 * @fileoverview Template cloning for compiled static shapes.
 *
 * Compiled row blocks and (future) root blocks can clone from a cached
 * `<template>` element instead of calling `document.createElement` per node.
 */

const templateCache = new Map<string, HTMLTemplateElement>();

/**
 * Clone an element from a cached HTML template string.
 * @internal
 */
export function __cloneTemplate(html: string): HTMLElement {
  let template = templateCache.get(html);
  if (!template) {
    template = document.createElement('template');
    template.innerHTML = html;
    templateCache.set(html, template);
  }

  return template.content.firstElementChild!.cloneNode(true) as HTMLElement;
}
