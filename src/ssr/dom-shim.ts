/**
 * @fileoverview Minimal server-side DOM shim for Auwla SSR.
 *
 * Provides just enough DOM API surface for the runtime and the compiler
 * runtime to render components on the server. It is intentionally NOT a full
 * DOM implementation — only the operations Auwla uses.
 */

export const ELEMENT_NODE = 1
export const TEXT_NODE = 3
export const COMMENT_NODE = 8
export const DOCUMENT_FRAGMENT_NODE = 11

type Parent = AuwlaElement | AuwlaDocumentFragment

export class AuwlaNodeBase {
  static ELEMENT_NODE = ELEMENT_NODE
  static TEXT_NODE = TEXT_NODE
  static COMMENT_NODE = COMMENT_NODE
  static DOCUMENT_FRAGMENT_NODE = DOCUMENT_FRAGMENT_NODE
}

export interface AuwlaNode {
  nodeType: number
  nodeName: string
  parentNode: Parent | null
  nextSibling: AuwlaNode | null
  previousSibling: AuwlaNode | null
  ownerDocument: typeof auwlaDocument | null
  textContent: string | null
  childNodes?: AuwlaNode[]
  firstChild?: AuwlaNode | null
  lastChild?: AuwlaNode | null
  cloneNode(deep?: boolean): AuwlaNode
  remove(): void
}

export interface AuwlaElement extends AuwlaNode {
  tagName: string
  attributes: Map<string, string>
  className: string
  style: Record<string, string>
  childNodes: AuwlaNode[]
  firstChild: AuwlaNode | null
  lastChild: AuwlaNode | null
  firstElementChild: AuwlaElement | null
  lastElementChild: AuwlaElement | null
  innerHTML: string
  outerHTML: string
  __memoListeners?: Map<string, EventListener>
  setAttribute(name: string, value: string): void
  removeAttribute(name: string): void
  getAttribute(name: string): string | null
  hasAttribute(name: string): boolean
  appendChild(node: AuwlaNode): AuwlaNode
  removeChild(node: AuwlaNode): AuwlaNode
  replaceChild(newNode: AuwlaNode, oldNode: AuwlaNode): AuwlaNode
  insertBefore(newNode: AuwlaNode, refNode: AuwlaNode | null): AuwlaNode
  append(...nodes: (AuwlaNode | string)[]): void
  prepend(...nodes: (AuwlaNode | string)[]): void
  replaceChildren(...nodes: (AuwlaNode | string)[]): void
  addEventListener(type: string, listener: EventListener): void
  removeEventListener(type: string, listener: EventListener): void
  contains(node: AuwlaNode): boolean
  querySelector(selector: string): AuwlaElement | null
  querySelectorAll(selector: string): AuwlaElement[]
}

// ---------------------------------------------------------------------------
// Child/sibling bookkeeping
// ---------------------------------------------------------------------------

function linkChild(parent: Parent, child: AuwlaNode, ref: AuwlaNode | null = null): void {
  child.parentNode = parent
  if (ref) {
    const idx = parent.childNodes.indexOf(ref)
    if (idx >= 0) {
      parent.childNodes.splice(idx, 0, child)
      updateSiblings(parent)
      return
    }
  }
  parent.childNodes.push(child)
  updateSiblings(parent)
}

function unlinkChild(parent: Parent, child: AuwlaNode): void {
  const idx = parent.childNodes.indexOf(child)
  if (idx < 0) return
  parent.childNodes.splice(idx, 1)
  child.parentNode = null
  updateSiblings(parent)
}

function updateSiblings(parent: Parent): void {
  for (let i = 0; i < parent.childNodes.length; i++) {
    const child = parent.childNodes[i]!
    child.previousSibling = parent.childNodes[i - 1] ?? null
    child.nextSibling = parent.childNodes[i + 1] ?? null
  }
  ;(parent as any).firstChild = parent.childNodes[0] ?? null
  ;(parent as any).lastChild = parent.childNodes[parent.childNodes.length - 1] ?? null
  const elements = parent.childNodes.filter((c) => c.nodeType === ELEMENT_NODE) as AuwlaElement[]
  ;(parent as any).firstElementChild = elements[0] ?? null
  ;(parent as any).lastElementChild = elements[elements.length - 1] ?? null
}

function normalizeChild(child: AuwlaNode | string): AuwlaNode {
  if (typeof child === 'string') {
    return new AuwlaTextNode(child)
  }
  return child
}

function detach(node: AuwlaNode): void {
  if (node.parentNode) {
    unlinkChild(node.parentNode, node)
  }
}

// ---------------------------------------------------------------------------
// Text node
// ---------------------------------------------------------------------------

export class AuwlaTextNode extends AuwlaNodeBase implements AuwlaNode {
  nodeType = TEXT_NODE
  nodeName = '#text'
  parentNode: Parent | null = null
  nextSibling: AuwlaNode | null = null
  previousSibling: AuwlaNode | null = null
  ownerDocument = auwlaDocument

  constructor(private _data: string) {
    super()
  }

  get data(): string {
    return this._data
  }

  set data(value: string) {
    this._data = value ?? ''
  }

  get textContent(): string {
    return this._data
  }

  set textContent(value: string) {
    this._data = value ?? ''
  }

  cloneNode(): AuwlaTextNode {
    return new AuwlaTextNode(this._data)
  }

  remove(): void {
    if (this.parentNode) unlinkChild(this.parentNode, this)
  }
}

// ---------------------------------------------------------------------------
// Comment node
// ---------------------------------------------------------------------------

export class AuwlaCommentNode extends AuwlaNodeBase implements AuwlaNode {
  nodeType = COMMENT_NODE
  nodeName = '#comment'
  parentNode: Parent | null = null
  nextSibling: AuwlaNode | null = null
  previousSibling: AuwlaNode | null = null
  ownerDocument = auwlaDocument

  constructor(private _data: string) {
    super()
  }

  get data(): string {
    return this._data
  }

  set data(value: string) {
    this._data = value ?? ''
  }

  get textContent(): string {
    return this._data
  }

  set textContent(value: string) {
    this._data = value ?? ''
  }

  cloneNode(): AuwlaCommentNode {
    return new AuwlaCommentNode(this._data)
  }

  remove(): void {
    if (this.parentNode) unlinkChild(this.parentNode, this)
  }
}

// ---------------------------------------------------------------------------
// Document fragment
// ---------------------------------------------------------------------------

export class AuwlaDocumentFragment extends AuwlaNodeBase implements AuwlaNode {
  nodeType = DOCUMENT_FRAGMENT_NODE
  nodeName = '#document-fragment'
  parentNode: Parent | null = null
  nextSibling: AuwlaNode | null = null
  previousSibling: AuwlaNode | null = null
  ownerDocument = auwlaDocument
  childNodes: AuwlaNode[] = []
  firstChild: AuwlaNode | null = null
  lastChild: AuwlaNode | null = null
  firstElementChild: AuwlaElement | null = null
  lastElementChild: AuwlaElement | null = null

  get textContent(): string {
    return this.childNodes.map((c) => c.textContent).join('')
  }

  set textContent(_value: string) {
    // no-op
  }

  appendChild(node: AuwlaNode): AuwlaNode {
    detach(node)
    linkChild(this, node)
    return node
  }

  cloneNode(deep?: boolean): AuwlaDocumentFragment {
    const clone = new AuwlaDocumentFragment()
    if (deep) {
      for (const child of this.childNodes) {
        clone.appendChild(child.cloneNode(true))
      }
    }
    return clone
  }

  remove(): void {
    // fragments cannot be removed
  }
}

// ---------------------------------------------------------------------------
// Element
// ---------------------------------------------------------------------------

export class AuwlaElementNode extends AuwlaNodeBase implements AuwlaElement {
  nodeType = ELEMENT_NODE
  nodeName: string
  parentNode: Parent | null = null
  nextSibling: AuwlaNode | null = null
  previousSibling: AuwlaNode | null = null
  ownerDocument = auwlaDocument
  childNodes: AuwlaNode[] = []
  firstChild: AuwlaNode | null = null
  lastChild: AuwlaNode | null = null
  firstElementChild: AuwlaElement | null = null
  lastElementChild: AuwlaElement | null = null
  attributes = new Map<string, string>()
  style: Record<string, string> = {}
  __memoListeners?: Map<string, EventListener>

  constructor(public tagName: string) {
    super()
    this.nodeName = tagName.toUpperCase()
  }

  get className(): string {
    return this.getAttribute('class') ?? ''
  }

  set className(value: string) {
    if (value) {
      this.setAttribute('class', value)
    } else {
      this.removeAttribute('class')
    }
  }

  get textContent(): string {
    return this.childNodes.map((c) => c.textContent).join('')
  }

  set textContent(value: string) {
    const text = value ?? ''
    this.childNodes = text ? [new AuwlaTextNode(text)] : []
    updateSiblings(this)
  }

  get innerHTML(): string {
    return this.childNodes.map(serializeNode).join('')
  }

  set innerHTML(value: string) {
    this.childNodes = []
    const parsed = parseHtml(value)
    for (const child of parsed) {
      linkChild(this, child)
    }
    updateSiblings(this)
  }

  get outerHTML(): string {
    return serializeNode(this)
  }

  setAttribute(name: string, value: string): void {
    this.attributes.set(name.toLowerCase(), String(value))
  }

  removeAttribute(name: string): void {
    this.attributes.delete(name.toLowerCase())
  }

  getAttribute(name: string): string | null {
    return this.attributes.get(name.toLowerCase()) ?? null
  }

  hasAttribute(name: string): boolean {
    return this.attributes.has(name.toLowerCase())
  }

  appendChild(node: AuwlaNode): AuwlaNode {
    detach(node)
    linkChild(this, node)
    return node
  }

  removeChild(node: AuwlaNode): AuwlaNode {
    unlinkChild(this, node)
    return node
  }

  replaceChild(newNode: AuwlaNode, oldNode: AuwlaNode): AuwlaNode {
    const idx = this.childNodes.indexOf(oldNode)
    if (idx < 0) {
      throw new Error('Node not found')
    }
    detach(newNode)
    this.childNodes[idx] = newNode
    newNode.parentNode = this
    oldNode.parentNode = null
    updateSiblings(this)
    return newNode
  }

  insertBefore(newNode: AuwlaNode, refNode: AuwlaNode | null): AuwlaNode {
    if (refNode === null) {
      return this.appendChild(newNode)
    }
    detach(newNode)
    linkChild(this, newNode, refNode)
    return newNode
  }

  append(...nodes: (AuwlaNode | string)[]): void {
    for (const raw of nodes) {
      const node = normalizeChild(raw)
      this.appendChild(node)
    }
  }

  prepend(...nodes: (AuwlaNode | string)[]): void {
    const normalized = nodes.map(normalizeChild)
    for (const node of normalized) {
      detach(node)
    }
    this.childNodes = [...normalized, ...this.childNodes]
    updateSiblings(this)
  }

  replaceChildren(...nodes: (AuwlaNode | string)[]): void {
    for (const child of [...this.childNodes]) {
      unlinkChild(this, child)
    }
    for (const raw of nodes) {
      const node = normalizeChild(raw)
      linkChild(this, node)
    }
  }

  remove(): void {
    if (this.parentNode) {
      unlinkChild(this.parentNode, this)
    }
  }

  cloneNode(deep?: boolean): AuwlaElementNode {
    const clone = new AuwlaElementNode(this.tagName)
    for (const [name, value] of this.attributes) {
      clone.attributes.set(name, value)
    }
    clone.style = { ...this.style }
    if (deep) {
      for (const child of this.childNodes) {
        clone.appendChild(child.cloneNode(true))
      }
    }
    return clone
  }

  addEventListener(_type: string, _listener: EventListener): void {
    // SSR does not need event listeners.
  }

  removeEventListener(_type: string, _listener: EventListener): void {
    // SSR does not need event listeners.
  }

  contains(node: AuwlaNode): boolean {
    let current: AuwlaNode | null = node
    while (current) {
      if (current === this) return true
      current = current.parentNode
    }
    return false
  }

  querySelector(selector: string): AuwlaElement | null {
    for (const el of this.querySelectorAll(selector)) {
      return el
    }
    return null
  }

  querySelectorAll(selector: string): AuwlaElement[] {
    const results: AuwlaElement[] = []
    const walk = (node: AuwlaNode) => {
      if (node.nodeType !== ELEMENT_NODE) return
      const el = node as AuwlaElementNode
      if (matchesSelector(el, selector)) {
        results.push(el)
      }
      for (const child of el.childNodes) {
        walk(child)
      }
    }
    for (const child of this.childNodes) {
      walk(child)
    }
    return results
  }
}

function matchesSelector(el: AuwlaElementNode, selector: string): boolean {
  const trimmed = selector.trim()
  if (trimmed.startsWith('#')) {
    return el.getAttribute('id') === trimmed.slice(1)
  }
  if (trimmed.startsWith('.')) {
    const classes = (el.getAttribute('class') ?? '').split(/\s+/)
    return classes.includes(trimmed.slice(1))
  }
  return el.tagName.toLowerCase() === trimmed.toLowerCase()
}

// ---------------------------------------------------------------------------
// Template element
// ---------------------------------------------------------------------------

export class AuwlaTemplateElement extends AuwlaElementNode {
  content = new AuwlaDocumentFragment()

  constructor() {
    super('template')
  }

  get innerHTML(): string {
    return this.content.childNodes.map(serializeNode).join('')
  }

  set innerHTML(value: string) {
    this.content.childNodes = []
    const parsed = parseHtml(value)
    for (const child of parsed) {
      this.content.appendChild(child)
    }
  }
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

export class AuwlaEvent {
  constructor(public type: string) {}
  preventDefault(): void {}
  stopPropagation(): void {}
}

export class AuwlaCustomEvent extends AuwlaEvent {
  constructor(type: string, public detail?: unknown) {
    super(type)
  }
}

// ---------------------------------------------------------------------------
// HTML parser for innerHTML / templates
// ---------------------------------------------------------------------------

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

function parseHtml(html: string): AuwlaNode[] {
  const nodes: AuwlaNode[] = []
  const stack: AuwlaElementNode[] = []
  let i = 0

  function currentParent(): AuwlaElementNode | null {
    return stack[stack.length - 1] ?? null
  }

  function append(node: AuwlaNode): void {
    const parent = currentParent()
    if (parent) {
      linkChild(parent, node)
    } else {
      nodes.push(node)
    }
  }

  while (i < html.length) {
    const char = html[i]

    if (char === '<') {
      if (html[i + 1] === '/') {
        // End tag
        const end = html.indexOf('>', i)
        if (end < 0) break
        const tagName = html.slice(i + 2, end).trim().toLowerCase()
        i = end + 1
        // Pop until matching tag
        while (stack.length > 0 && stack[stack.length - 1]!.tagName.toLowerCase() !== tagName) {
          stack.pop()
        }
        if (stack.length > 0) {
          const closed = stack.pop()!
          updateSiblings(closed)
        }
        continue
      }

      if (html[i + 1] === '!' && html.slice(i + 2, i + 4) === '--') {
        // Comment
        const end = html.indexOf('-->', i)
        if (end < 0) break
        append(new AuwlaCommentNode(html.slice(i + 4, end)))
        i = end + 3
        continue
      }

      // Start tag
      const end = html.indexOf('>', i)
      if (end < 0) break
      const tagContent = html.slice(i + 1, end)
      i = end + 1

      const spaceIdx = tagContent.search(/\s/)
      const tagName = (spaceIdx < 0 ? tagContent : tagContent.slice(0, spaceIdx)).toLowerCase()
      const attrString = spaceIdx < 0 ? '' : tagContent.slice(spaceIdx + 1)

      const element = tagName === 'template' ? new AuwlaTemplateElement() : new AuwlaElementNode(tagName)
      parseAttributes(element, attrString)

      append(element)

      if (!voidElements.has(tagName) && !tagContent.endsWith('/')) {
        stack.push(element)
      } else {
        updateSiblings(element)
      }
      continue
    }

    // Text
    let textEnd = html.indexOf('<', i)
    if (textEnd < 0) textEnd = html.length
    const text = html.slice(i, textEnd)
    if (text) {
      append(new AuwlaTextNode(decodeHtmlEntities(text)))
    }
    i = textEnd
  }

  // Close any unclosed tags
  while (stack.length > 0) {
    updateSiblings(stack.pop()!)
  }

  return nodes
}

function parseAttributes(el: AuwlaElementNode, attrString: string): void {
  const regex = /(\S+?)\s*(?:=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g
  let match: RegExpExecArray | null
  while ((match = regex.exec(attrString)) !== null) {
    const name = match[1]!.toLowerCase()
    if (name === '/') continue
    const value = match[2] ?? match[3] ?? match[4] ?? ''
    el.setAttribute(name, value)
  }
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}

function serializeNode(node: AuwlaNode): string {
  if (node.nodeType === TEXT_NODE) {
    return escapeHtml(node.textContent ?? '')
  }
  if (node.nodeType === COMMENT_NODE) {
    return `<!--${(node.textContent ?? '').replace(/-->/g, '--&gt;')}-->`
  }
  if (node.nodeType !== ELEMENT_NODE) {
    return ''
  }
  const el = node as AuwlaElementNode
  const tag = el.tagName.toLowerCase()
  const attrs: string[] = []
  for (const [name, value] of el.attributes.entries()) {
    if (name === 'class' && !value) continue
    if (value === '') {
      attrs.push(` ${name}`)
    } else {
      attrs.push(` ${name}="${escapeHtml(value)}"`)
    }
  }
  const styleEntries = Object.entries(el.style)
  if (styleEntries.length > 0) {
    const style = styleEntries.map(([k, v]) => `${k}:${v}`).join(';')
    attrs.push(` style="${escapeHtml(style)}"`)
  }
  const attrStr = attrs.join('')
  if (voidElements.has(tag)) {
    return `<${tag}${attrStr}>`
  }
  const children = el.childNodes.map(serializeNode).join('')
  return `<${tag}${attrStr}>${children}</${tag}>`
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// ---------------------------------------------------------------------------
// Range
// ---------------------------------------------------------------------------

class AuwlaRange {
  private startContainer: Parent | null = null
  private startOffset = 0
  private endContainer: Parent | null = null
  private endOffset = 0

  setStartBefore(node: AuwlaNode): void {
    const parent = node.parentNode
    if (!parent) throw new Error('Range.setStartBefore: node has no parent')
    this.startContainer = parent
    this.startOffset = parent.childNodes.indexOf(node)
  }

  setEndBefore(node: AuwlaNode): void {
    const parent = node.parentNode
    if (!parent) throw new Error('Range.setEndBefore: node has no parent')
    this.endContainer = parent
    this.endOffset = parent.childNodes.indexOf(node)
  }

  deleteContents(): void {
    if (!this.startContainer || !this.endContainer) return
    if (this.startContainer !== this.endContainer) return
    const parent = this.startContainer
    const count = Math.max(0, this.endOffset - this.startOffset)
    const toRemove = parent.childNodes.slice(this.startOffset, this.startOffset + count)
    for (const node of toRemove) {
      unlinkChild(parent, node)
    }
  }

  detach(): void {
    // no-op
  }
}

// ---------------------------------------------------------------------------
// Document / window
// ---------------------------------------------------------------------------

export const auwlaDocument = {
  createElement(tag: string): AuwlaElementNode {
    if (tag === 'template') {
      return new AuwlaTemplateElement()
    }
    return new AuwlaElementNode(tag)
  },
  createTextNode(data: string): AuwlaTextNode {
    return new AuwlaTextNode(String(data))
  },
  createComment(data: string): AuwlaCommentNode {
    return new AuwlaCommentNode(String(data))
  },
  createDocumentFragment(): AuwlaDocumentFragment {
    return new AuwlaDocumentFragment()
  },
  createRange(): AuwlaRange {
    return new AuwlaRange()
  },
}

export const auwlaWindow = {
  location: {
    pathname: '/',
    search: '',
    href: 'http://localhost/',
    origin: 'http://localhost',
  },
  addEventListener(_type: string, _listener: EventListener): void {
    // SSR does not need window events.
  },
  removeEventListener(_type: string, _listener: EventListener): void {
    // SSR does not need window events.
  },
}

class AuwlaSvgElement extends AuwlaElementNode {}

/**
 * Install the minimal DOM globals needed by the Auwla runtime on the server.
 * Safe to call multiple times; only installs missing globals.
 */
export function installDomShim(): void {
  if (typeof globalThis.document === 'undefined') {
    ;(globalThis as any).document = auwlaDocument
  }
  if (typeof globalThis.window === 'undefined') {
    ;(globalThis as any).window = auwlaWindow
  }
  if (typeof globalThis.Node === 'undefined') {
    ;(globalThis as any).Node = AuwlaNodeBase
  }
  if (typeof globalThis.Element === 'undefined') {
    ;(globalThis as any).Element = AuwlaElementNode
  }
  if (typeof globalThis.HTMLElement === 'undefined') {
    ;(globalThis as any).HTMLElement = AuwlaElementNode
  }
  if (typeof globalThis.SVGElement === 'undefined') {
    ;(globalThis as any).SVGElement = AuwlaSvgElement
  }
  if (typeof globalThis.DocumentFragment === 'undefined') {
    ;(globalThis as any).DocumentFragment = AuwlaDocumentFragment
  }
  if (typeof globalThis.Text === 'undefined') {
    ;(globalThis as any).Text = AuwlaTextNode
  }
  if (typeof globalThis.Comment === 'undefined') {
    ;(globalThis as any).Comment = AuwlaCommentNode
  }
  if (typeof globalThis.Event === 'undefined') {
    ;(globalThis as any).Event = AuwlaEvent
  }
  if (typeof globalThis.CustomEvent === 'undefined') {
    ;(globalThis as any).CustomEvent = AuwlaCustomEvent
  }
}
