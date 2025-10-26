import { el } from './createElement'
import type { Ref } from './state'

function isRef<T = any>(v: any): v is Ref<T> {
  return v && typeof v === 'object' && 'value' in v && typeof v.subscribe === 'function'
}

const eventPropRE = /^on([A-Z].*)$/
function toEventName(prop: string) {
  const m = eventPropRE.exec(prop)
  if (!m) return null
  const name = m[1]
  return name.charAt(0).toLowerCase() + name.slice(1)
}

function applyStyle(el: HTMLElement, style: any) {
  if (!style) return
  if (typeof style === 'string') {
    el.setAttribute('style', style)
  } else if (typeof style === 'object') {
    for (const k in style) {
      ;(el.style as any)[k] = (style as any)[k]
    }
  }
}

function setAttr(el: HTMLElement, key: string, value: any) {
  if (value == null || value === false) {
    el.removeAttribute(key)
    return
  }
  if (value === true) {
    el.setAttribute(key, '')
    return
  }
  // Prefer property when available, fallback to attribute
  if (key in el) {
    try {
      ;(el as any)[key] = value
      return
    } catch {}
  }
  el.setAttribute(key, String(value))
}

function appendChildren(parent: Node, children: any[]) {
  for (const child of children.flat(Infinity)) {
    if (child == null || child === false || child === true) continue

    if (isRef(child)) {
      // Treat as text binding by default
      const placeholder = document.createTextNode('')
      parent.appendChild(placeholder)
      // initial
      placeholder.textContent = child.value == null ? '' : String(child.value)
      // subscribe
      child.subscribe(v => {
        placeholder.textContent = v == null ? '' : String(v)
      })
      continue
    }

    if (typeof child === 'string' || typeof child === 'number') {
      parent.appendChild(document.createTextNode(String(child)))
    } else if (child instanceof Node) {
      parent.appendChild(child)
    } else if (Array.isArray(child)) {
      appendChildren(parent, child)
    } else {
      // Unknown child type; ignore
    }
  }
}

export function h(type: any, rawProps: any, ...rawChildren: any[]): Node {
  const props = rawProps || {}

  // Function component
  if (typeof type === 'function') {
    return type({ ...props, children: rawChildren })
  }

  // Intrinsic element
  const tag = type as keyof HTMLElementTagNameMap
  const builder = el(tag)
  const element = builder.element

  for (const key in props) {
    if (key === 'children') continue
    const val = props[key]

    // Events (onClick, onInput, ...)
    const eventName = toEventName(key)
    if (eventName) {
      element.addEventListener(eventName, val as EventListener)
      continue
    }

    // class / className
    if (key === 'class' || key === 'className') {
      if (isRef(val)) {
        element.className = String(val.value ?? '')
        val.subscribe(v => { element.className = String(v ?? '') })
      } else {
        element.className = String(val ?? '')
      }
      continue
    }

    // style
    if (key === 'style') {
      if (isRef(val)) {
        applyStyle(element, val.value)
        val.subscribe(v => applyStyle(element, v))
      } else {
        applyStyle(element, val)
      }
      continue
    }

    // ref callback
    if (key === 'ref' && typeof val === 'function') {
      val(element)
      continue
    }

    // Common input-specific mirroring (value/checked/disabled/placeholder/type)
    if (key === 'value' || key === 'checked' || key === 'disabled' || key === 'placeholder' || key === 'type' || key === 'href' || key === 'src' || key === 'alt') {
      if (isRef(val)) {
        setAttr(element, key, val.value)
        val.subscribe(v => setAttr(element, key, v))
      } else {
        setAttr(element, key, val)
      }
      continue
    }

    // Generic attribute/property with Ref support
    if (isRef(val)) {
      setAttr(element, key, val.value)
      val.subscribe(v => setAttr(element, key, v))
    } else {
      setAttr(element, key, val)
    }
  }

  appendChildren(element, rawChildren)
  return element
}

export function Fragment(props: any, ...children: any[]): DocumentFragment {
  const frag = document.createDocumentFragment()
  appendChildren(frag, children)
  return frag
}
