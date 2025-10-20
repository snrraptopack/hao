import { Component } from './dsl'
import { ref, watch, type Ref } from './state'
import type { EventHandlers } from './createElement'

// JSX Runtime for Auwla Framework
// This allows writing JSX that compiles to Auwla Components

export interface JSXElement {
  type: string | Function
  props: Record<string, any>
  children: (JSXElement | string | number | boolean | null | undefined)[]
}

export interface IntrinsicElements {
  div: JSXProps
  span: JSXProps
  p: JSXProps
  h1: JSXProps
  h2: JSXProps
  h3: JSXProps
  h4: JSXProps
  h5: JSXProps
  h6: JSXProps
  button: JSXProps & { onClick?: () => void }
  input: JSXProps & { 
    type?: string
    value?: string | Ref<string>
    checked?: boolean | Ref<boolean>
    onChange?: (e: Event) => void
    onInput?: (e: Event) => void
  }
  a: JSXProps & { href?: string }
  img: JSXProps & { src?: string; alt?: string }
  ul: JSXProps
  ol: JSXProps
  li: JSXProps
  form: JSXProps & { onSubmit?: (e: Event) => void }
  label: JSXProps
  select: JSXProps
  option: JSXProps & { value?: string }
  textarea: JSXProps
}

interface JSXProps {
  className?: string
  id?: string
  style?: string | Record<string, string>
  children?: any
  key?: string | number
}

// JSX Factory Function
export function jsx(
  type: string | Function,
  props: Record<string, any> | null,
  ...children: any[]
): JSXElement {
  const normalizedProps = props || {}
  const flatChildren = children.flat().filter(child => 
    child !== null && child !== undefined && child !== false
  )
  
  return {
    type,
    props: normalizedProps,
    children: flatChildren
  }
}

// Fragment support
export function Fragment({ children }: { children: any[] }) {
  return children
}

// Convert JSX to Auwla Component
export function jsxToComponent(jsxElement: JSXElement | JSXElement[]): HTMLElement {
  return Component((ui) => {
    if (Array.isArray(jsxElement)) {
      jsxElement.forEach(element => renderJSXElement(element, ui))
    } else {
      renderJSXElement(jsxElement, ui)
    }
  })
}

function renderJSXElement(element: JSXElement, ui: any): void {
  if (!element || typeof element !== 'object') {
    return
  }

  const { type, props, children } = element

  if (typeof type === 'string') {
    // Intrinsic HTML elements
    renderIntrinsicElement(type, props, children, ui)
  } else if (typeof type === 'function') {
    // Component functions
    const result = type(props)
    if (result && typeof result === 'object' && 'type' in result) {
      renderJSXElement(result, ui)
    }
  }
}

function renderIntrinsicElement(
  tagName: string, 
  props: Record<string, any>, 
  children: any[], 
  ui: any
): void {
  const auwlaProps: Record<string, any> = {}
  
  // Convert JSX props to Auwla props
  if (props.className) {
    auwlaProps.className = props.className
  }
  
  if (props.id) {
    auwlaProps.id = props.id
  }

  // Handle text content for simple elements
  const textContent = extractTextContent(children)
  if (textContent !== null) {
    if (isRef(textContent)) {
      auwlaProps.value = textContent
    } else {
      auwlaProps.text = textContent
    }
  }

  // Handle event handlers
  const eventHandlers: Record<string, Function> = {}
  Object.keys(props).forEach(key => {
    if (key.startsWith('on') && typeof props[key] === 'function') {
      const eventName = key.slice(2).toLowerCase()
      eventHandlers[eventName] = props[key]
    }
  })
  
  if (Object.keys(eventHandlers).length > 0) {
    auwlaProps.on = eventHandlers
  }

  // Handle input-specific props
  if (tagName === 'input') {
    if (props.type) auwlaProps.type = props.type
    if (props.value !== undefined) auwlaProps.value = props.value
    if (props.checked !== undefined) auwlaProps.checked = props.checked
  }

  // Handle anchor-specific props
  if (tagName === 'a' && props.href) {
    auwlaProps.href = props.href
  }

  // Handle image-specific props
  if (tagName === 'img') {
    if (props.src) auwlaProps.src = props.src
    if (props.alt) auwlaProps.alt = props.alt
  }

  // Map JSX tag names to Auwla UI methods
  const methodName = getAuwlaMethodName(tagName)
  
  if (hasComplexChildren(children)) {
    // Element with nested children
    ui[methodName](auwlaProps, (childUi: any) => {
      children.forEach(child => {
        if (typeof child === 'object' && child !== null && 'type' in child) {
          renderJSXElement(child, childUi)
        } else if (typeof child === 'string' || typeof child === 'number') {
          childUi.Text({ text: String(child) })
        }
      })
    })
  } else {
    // Simple element
    ui[methodName](auwlaProps)
  }
}

function extractTextContent(children: any[]): string | Ref<any> | null {
  if (children.length === 0) return null
  if (children.length === 1) {
    const child = children[0]
    if (typeof child === 'string' || typeof child === 'number') {
      return String(child)
    }
    if (isRef(child)) {
      return child
    }
  }
  return null
}

function hasComplexChildren(children: any[]): boolean {
  return children.some(child => 
    typeof child === 'object' && child !== null && 'type' in child
  )
}

function isRef(value: any): value is Ref<any> {
  return value && typeof value === 'object' && 'value' in value && 'subscribe' in value
}

function getAuwlaMethodName(tagName: string): string {
  const methodMap: Record<string, string> = {
    'div': 'Div',
    'span': 'Span',
    'p': 'P',
    'h1': 'H1',
    'h2': 'H2',
    'h3': 'H3',
    'h4': 'H4',
    'h5': 'H5',
    'h6': 'H6',
    'button': 'Button',
    'input': 'Input',
    'a': 'A',
    'img': 'Img',
    'ul': 'Ul',
    'ol': 'Ol',
    'li': 'Li',
    'form': 'Form',
    'label': 'Label',
    'select': 'Select',
    'option': 'Option',
    'textarea': 'Textarea'
  }
  
  return methodMap[tagName] || 'Div'
}

// Export for JSX transform
export { jsx as jsxs }
export const jsxDEV = jsx