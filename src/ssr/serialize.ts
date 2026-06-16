/**
 * @fileoverview Serialize a DOM tree to an HTML string.
 *
 * Works with both the Auwla server-side DOM shim and real DOM
 * implementations such as jsdom or linkedom.
 */

import type { AuwlaElement, AuwlaNode } from './dom-shim'
import { ELEMENT_NODE, TEXT_NODE, COMMENT_NODE } from './dom-shim'

const voidElements = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
])

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function isMapLike(value: unknown): value is Map<string, string> {
  return value instanceof Map
}

function serializeAttributes(el: AuwlaElement): string {
  const attrs: string[] = []

  if (isMapLike(el.attributes)) {
    for (const [name, value] of el.attributes.entries()) {
      if (name === 'class' && !value) continue
      if (value === '') {
        attrs.push(` ${name}`)
      } else {
        attrs.push(` ${name}="${escapeHtml(value)}"`)
      }
    }
  } else {
    // Real DOM: NamedNodeMap
    const attributes = el.attributes as unknown as NamedNodeMap
    for (let i = 0; i < attributes.length; i++) {
      const attr = attributes.item(i)
      if (!attr) continue
      const name = attr.name
      const value = attr.value
      if (name === 'class' && !value) continue
      if (value === '') {
        attrs.push(` ${name}`)
      } else {
        attrs.push(` ${name}="${escapeHtml(value)}"`)
      }
    }
  }

  // Serialize inline styles if any were set.
  const style = serializeStyle(el)
  if (style) {
    attrs.push(` style="${escapeHtml(style)}"`)
  }

  return attrs.join('')
}

function serializeStyle(el: AuwlaElement): string {
  const style = el.style

  if (
    typeof CSSStyleDeclaration !== 'undefined' &&
    style instanceof CSSStyleDeclaration
  ) {
    return (style as CSSStyleDeclaration).cssText
  }

  const entries = Object.entries(style as Record<string, string>)
  if (entries.length === 0) return ''
  return entries.map(([k, v]) => `${k}:${v}`).join(';')
}

function getChildNodes(node: AuwlaNode): AuwlaNode[] {
  if (!node.childNodes) return []
  return Array.isArray(node.childNodes)
    ? (node.childNodes as AuwlaNode[])
    : (Array.from(node.childNodes) as AuwlaNode[])
}

export function serializeNode(node: AuwlaNode): string {
  if (node.nodeType === TEXT_NODE) {
    return escapeHtml(node.textContent ?? '')
  }

  if (node.nodeType === COMMENT_NODE) {
    return `<!--${(node.textContent ?? '').replace(/-->/g, '--&gt;')}-->`
  }

  if (node.nodeType !== ELEMENT_NODE) {
    return ''
  }

  const el = node as AuwlaElement
  const tag = el.tagName.toLowerCase()
  const attrs = serializeAttributes(el)

  if (voidElements.has(tag)) {
    return `<${tag}${attrs}>`
  }

  const children = getChildNodes(el).map(serializeNode).join('')
  return `<${tag}${attrs}>${children}</${tag}>`
}

export function serializeChildren(root: AuwlaElement): string {
  return getChildNodes(root).map(serializeNode).join('')
}
