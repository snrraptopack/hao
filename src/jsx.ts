import { el } from './createElement'; // Assuming this import
import { 
  ref, 
  watch, 
  setWatchContext, 
  type Ref 
} from './state';
import { 
  createComponentContext, 
  setCurrentComponent, 
  executeMountCallbacks, 
  executeCleanup 
} from './lifecycle';

// DevTools integration
import { devHook, isDevEnv } from './devtools';
// Shared DOM helpers
import { applyStyle, setAttr, CLASS_TOKENS, applyClassTokens, tokenizeClass } from './dom-attrs';

// --- HELPERS (Modified for watch) ---

function isRef<T = any>(v: any): v is Ref<T> {
  return v && typeof v === 'object' && 'value' in v && typeof v.subscribe === 'function';
}

const eventPropRE = /^on([A-Z].*)$/;
function toEventName(prop: string) {
  const m = eventPropRE.exec(prop);
  if (!m) return null;
  const name = m[1] ?? " ";
  return name.charAt(0).toLowerCase() + name.slice(1);
}

/**
 * Appends children to a parent node.
 * Uses watch() for automatic cleanup and supports Ref<Node | string | array>.
 */
function appendChildren(parent: Node, children: any[]) {
  const flatChildren = children.flat(Infinity);
  for (const child of flatChildren) {
    if (child == null || child === false || child === true) continue;

    const insertValue = (before: Node, v: any) => {
      if (v == null || v === false || v === true) return;
      if (typeof v === 'string' || typeof v === 'number') {
        before.parentNode?.insertBefore(document.createTextNode(String(v)), before);
      } else if (v instanceof Node) {
        before.parentNode?.insertBefore(v, before);
      } else if (Array.isArray(v)) {
        for (const c of v.flat(Infinity)) insertValue(before, c);
      } else {
        // Fallback: stringify unknown types
        before.parentNode?.insertBefore(document.createTextNode(String(v)), before);
      }
    };

    if (isRef(child)) {
      // OPTIMIZATION: Lightweight text binding for Ref<string | number>
      const initial = child.value;
      if (typeof initial === 'string' || typeof initial === 'number') {
        const text = document.createTextNode(String(initial));
        parent.appendChild(text);
        watch(child, (v) => { text.textContent = String(v ?? ''); });
      } else {
        // Fallback to marker-based rendering for complex types (Node/array)
        const start = document.createComment('ref-start');
        const end = document.createComment('ref-end');
        parent.appendChild(start);
        parent.appendChild(end);

        const render = (v: any) => {
          // Remove all nodes between markers
          let node: ChildNode | null = start.nextSibling as ChildNode | null;
          while (node && node !== end) {
            const next = node.nextSibling as ChildNode | null;
            node.remove();
            node = next;
          }
          // Insert new value(s)
          insertValue(end, v);
        };

        render(child.value);
        watch(child, (v) => render(v));
      }
      continue;
    }

    if (typeof child === 'string' || typeof child === 'number') {
      parent.appendChild(document.createTextNode(String(child)));
    } else if (child instanceof Node) {
      parent.appendChild(child);
    } else if (Array.isArray(child)) {
      appendChildren(parent, child);
    }
  }
}

// --- CORE JSX RUNTIME ---

/**
 * The core JSX factory function used by Auwla.
 * Handles function components, refs as children, attributes/events,
 * and automatic lifecycle binding with `onMount`/cleanup.
 *
 * Examples (JSX):
 *
 * - Basic element
 *   `<div className="box">Hello</div>`
 *
 * - Event handlers
 *   `<button onClick={() => alert('clicked')}>Click</button>`
 *
 * - Reactive children with `Ref`
 *   `const count = ref(0); <button onClick={() => count.value++}>{count}</button>`
 *
 * - Component usage
 *   `function App() { return <main><h1>Welcome</h1></main>; }`
 */
// Overloads to provide better typing for intrinsic elements and components
type IntrinsicTagName = keyof JSX.IntrinsicElements & keyof HTMLElementTagNameMap;
export function h<K extends IntrinsicTagName>(
  type: K,
  rawProps?: JSX.IntrinsicElements[K],
  ...rawChildren: any[]
): HTMLElementTagNameMap[K];
export function h<P>(
  type: (props: P & { children?: any }) => HTMLElement,
  rawProps?: P,
  ...rawChildren: any[]
): HTMLElement;
export function h(type: any, rawProps: any, ...rawChildren: any[]): Node {
  const props = rawProps || {};

  // ---------------------------------------------
  // ✅ 1. FUNCTION COMPONENT (with Lifecycle)
  // ---------------------------------------------
  if (typeof type === 'function') {
    // It's a component, so we must set up the lifecycle context
    const context = createComponentContext();

    // DevTools: Track component creation
    if (isDevEnv()) {
      devHook('onComponentCreated', type.name || 'Anonymous', context, props);
    }

    // 1. SET THE GLOBAL CONTEXT
    setCurrentComponent(context);
    setWatchContext(context.cleanups); // For auto-cleanup of watch()

    // 2. RUN THE COMPONENT FUNCTION
    // All onMount, onUnmount, and watch calls inside will
    // now register with the `context`
    const element = type({ ...props, children: rawChildren }) as HTMLElement;

    // 3. CLEAR THE GLOBAL CONTEXT
    setCurrentComponent(null);
    setWatchContext(null);

    // 4. ATTACH LIFECYCLE AND CLEANUP LOGIC TO THE ELEMENT
    (element as any).__context = context;
    (element as any).__cleanup = () => {
      // DevTools: Track component cleanup
      if (isDevEnv()) {
        devHook('onComponentDestroyed', type.name || 'Anonymous', context);
      }
      executeCleanup(context);
    };

    // 5. Mount callbacks if already connected; further lifecycle handled centrally
    if (element.isConnected) {
      executeMountCallbacks(context);
    }

    // 6. RETURN THE FULLY-LIFECYCLE-AWARE ELEMENT
    return element;
  }

  // ---------------------------------------------
  // ✅ 2. INTRINSIC ELEMENT (with reactive bindings)
  // ---------------------------------------------
  const tag = type as keyof HTMLElementTagNameMap;
  const builder = el(tag); // Assuming `el` is from './createElement'
  const element = builder.element;

  for (const key in props) {
    if (key === 'children') continue;
    const val = props[key];

    // Events (onClick, onInput, ...)
    const eventName = toEventName(key);
    if (eventName) {
      element.addEventListener(eventName, val as EventListener);
      // TODO: Add event listener cleanup via onUnmount if needed,
      // but browser garbage collection is usually fine for this.
      continue;
    }

    // class / className
    if (key === 'class' || key === 'className') {
      if (isRef(val)) {
        // Initial set and record tokens
        const initial = String(val.value ?? '');
        element.className = initial;
        (element as any)[CLASS_TOKENS] = new Set(tokenizeClass(initial));
        // ✅ subscribe -> watch with diff-based updates
        watch(val, (v) => applyClassTokens(element, v));
      } else {
        // Static set
        element.className = String(val ?? '');
        (element as any)[CLASS_TOKENS] = new Set(tokenizeClass(val));
      }
      continue;
    }

    // style
    if (key === 'style') {
      if (isRef(val)) {
        applyStyle(element, val.value);
        // ✅ subscribe -> watch
        watch(val, (v) => applyStyle(element, v));
      } else {
        applyStyle(element, val);
      }
      continue;
    }

    // ref callback
    if (key === 'ref' && typeof val === 'function') {
      val(element);
      continue;
    }

    // Common input-specific mirroring (value/checked/disabled/placeholder/type)
    const commonProps = ['value', 'checked', 'disabled', 'placeholder', 'type', 'href', 'src', 'alt'];
    if (commonProps.includes(key)) {
      if (isRef(val)) {
        setAttr(element, key, val.value);
        // ✅ subscribe -> watch
        watch(val, (v) => setAttr(element, key, v));
      } else {
        setAttr(element, key, val);
      }
      continue;
    }

    // Generic attribute/property with Ref support
    if (isRef(val)) {
      setAttr(element, key, val.value);
      // ✅ subscribe -> watch
      watch(val, (v) => setAttr(element, key, v));
    } else {
      setAttr(element, key, val);
    }
  }

  appendChildren(element, rawChildren);
  return element;
}

/**
 * JSX `Fragment` support for grouping children without introducing extra DOM elements.
 *
 * Example (JSX):
 * `<Fragment>
 *   <h1>Title</h1>
 *   <p>Description</p>
 * </Fragment>`
 */
export function Fragment(props: any, ...children: any[]): DocumentFragment {
  const frag = document.createDocumentFragment();
  // Pass children to the *modified* appendChildren
  appendChildren(frag, children);
  return frag;
}