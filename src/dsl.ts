import { el,type EventHandlers, type EventMap } from "./createElement";
import type { Ref } from "./state";
import { setCurrentComponent, 
  createComponentContext, 
  executeMountCallbacks, 
  executeCleanup,
  type ComponentContext
 } from "./lifecycle";

 import { setWatchContext } from "./state";
 import { applyClassTokens, tokenizeClass, CLASS_TOKENS, applyStyle as domApplyStyle, setStyleObject as domSetStyleObject, setAttr } from './dom-attrs';

const HTML_TAGS = [
  'div', 'span', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'a', 'img', 'ul', 'ol', 'li', 'table', 'tr', 'td', 'th',
  'form', 'label', 'select', 'option', 'textarea',
  'header', 'footer', 'nav', 'main', 'section', 'article', 'aside',
  'button', 'input',
] as const;

type HTMLTag = typeof HTML_TAGS[number];

interface ElementConfig {
  text?: string | number | Ref<string | number>;
  on?: EventHandlers;
  id?: string;
  className?: string | Ref<string>;
  style?: string | Partial<CSSStyleDeclaration> | Ref<string | Partial<CSSStyleDeclaration>>;
  href?: string; // for <a>
  src?: string;  // for <img>
  alt?: string;  // for <img>
  type?: string; // for <input>, <button>
  placeholder?: string; // for <input>, <textarea>
  value?: string | number | Ref<string | number>;
  checked?: boolean | Ref<boolean>;
  disabled?: boolean | Ref<boolean>;
  shouldHide?: Ref<boolean>;
  // Element ref callback: invoked with the created element
  ref?: (el: HTMLElement) => void;
  [key: string]: unknown; // Allow other HTML attributes without constraining known keys
}

// interface DIVConfig{
//   text?:string,
//   on?:EventHandlers
//   id?:string
//   className?: string | Ref<string>;
// }

// interface ButtonConfig {
//   text: string | Ref<string>;
//   on?: EventHandlers;
//   disabled?: boolean | Ref<boolean>;
//   className?: string | Ref<string>;
// }

// interface TextConfig {
//   value: string | Ref<any>;
//   formatter?: (v: any) => string;
//   on?: EventHandlers;
//   className?: string | Ref<string>;
// }

// type InputConfig = {
//   id?: string;
//   placeholder?: string;
//   type?: string;
//   on?: EventHandlers;
//   value?: string | Ref<string>;
//   className?: string | Ref<string>;
//   checked?: boolean | Ref<boolean>;
// }

interface TextConfig {
  value: string | number | Ref<string | number>;
  formatter?: (v: any) => string;
  on?: EventHandlers;
  className?: string | Ref<string>;
}

interface ListConfig<T> {
  items: Ref<T[]>;
  className?: string | Ref<string>;
  render: (item: T, index: number, ui: LayoutBuilder) => void;
  key?: (item: T) => string | number;
}

export class LayoutBuilder {
  private children: HTMLElement[] = [];
  private cleanups: Array<() => void> = []; // Track cleanup functions

  private applyEvents(el: HTMLElement, handlers?: EventHandlers) {
    if (!handlers) return;
    (Object.keys(handlers) as (keyof EventMap)[]).forEach(eventName => {
      const handler = handlers[eventName];
      if (handler){
        el.addEventListener(eventName, handler as EventListener);

        this.cleanups.push(()=>{
          el.removeEventListener(eventName,handler as EventListener)
        })
      }
    });
  }

  private applyClassName(element: HTMLElement, className?: string | Ref<string>) {
    if (!className) return;
    
    if (typeof className === 'string') {
      element.className = className;
      (element as any)[CLASS_TOKENS] = new Set(tokenizeClass(className));
    } else {
      const initial = className.value;
      element.className = initial;
      (element as any)[CLASS_TOKENS] = new Set(tokenizeClass(initial));
      const unsub = className.subscribe((newValue) => {
        applyClassTokens(element, newValue);
      });
      this.cleanups.push(unsub); // Track for cleanup
    }
  }

  private applyAttribute(element: HTMLElement, attr: string, value: string | number | boolean | Ref<string | number | boolean>) {
    if (value === undefined || value === null) return;
    
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      setAttr(element, attr, value as any);
    } else {
      // It's a Ref
      setAttr(element, attr, (value as Ref<any>).value as any);
      const unsub = (value as Ref<any>).subscribe((newValue: any) => {
        setAttr(element, attr, newValue as any);
      });
      this.cleanups.push(unsub);
    }
  }

  private applyStyle(element: HTMLElement, style?: string | Partial<CSSStyleDeclaration> | Ref<string | Partial<CSSStyleDeclaration>>) {
    if (!style) return;
    // String style
    if (typeof style === 'string') {
      domApplyStyle(element, style);
      return;
    }
    // Ref style
    if (style && typeof style === 'object' && 'value' in (style as any) && typeof (style as any).subscribe === 'function') {
      const refStyle = style as Ref<string | Partial<CSSStyleDeclaration>>;
      const initial = refStyle.value;
      if (typeof initial === 'string') {
        domApplyStyle(element, initial);
      } else {
        domSetStyleObject(element, initial as Partial<CSSStyleDeclaration>);
      }
      const unsub = refStyle.subscribe((newVal: any) => {
        if (typeof newVal === 'string') {
          domApplyStyle(element, newVal);
        } else {
          domSetStyleObject(element, newVal as Partial<CSSStyleDeclaration>);
        }
      });
      this.cleanups.push(unsub);
      return;
    }
    // Object style
    domSetStyleObject(element, style as Partial<CSSStyleDeclaration>);
  }

  private setStyleObject(element: HTMLElement, styleObj: Partial<CSSStyleDeclaration> | null | undefined) {
    if (!styleObj || typeof styleObj !== 'object') return;
    for (const k in styleObj) {
      try {
        const val = (styleObj as any)[k];
        (element.style as any)[k] = val as any;
      } catch {}
    }
  }

  /**
   * Generic element creator for any HTML tag
   */
  private createElement(
    tagName: HTMLTag, 
    config: ElementConfig, 
    builder?: (ui: LayoutBuilder) => void
  ) {

    const element = el(tagName).build();

    // Apply ref callback if provided
    try {
      if (typeof (config as any).ref === 'function') {
        ((config as any).ref as (el: HTMLElement) => void)(element);
      }
    } catch {}
    
    // Apply text content (string | number | Ref)
    if (config.text !== undefined) {
      if (typeof config.text === 'string' || typeof config.text === 'number') {
        element.textContent = String(config.text);
      } else {
        element.textContent = String(config.text.value);
        const unsub = config.text.subscribe((newValue) => {
          element.textContent = String(newValue);
        });
        this.cleanups.push(unsub);
      }
    }
    
    // Apply ID
    if (config.id) element.id = config.id;
    
    // Apply className (support both 'class' and 'className')
    const classValue = (config as any).class || config.className;
    this.applyClassName(element, classValue);

    // Apply style (string, object, or Ref)
    this.applyStyle(element, (config as any).style);
    
    // Apply events
    this.applyEvents(element, config.on);
    
    // Apply common attributes
    if (config.href) this.applyAttribute(element, 'href', config.href);
    if (config.src) this.applyAttribute(element, 'src', config.src);
    if (config.alt) this.applyAttribute(element, 'alt', config.alt);
    if (config.type) this.applyAttribute(element, 'type', config.type);
    if (config.placeholder) this.applyAttribute(element, 'placeholder', config.placeholder);
    
    // Handle value (for inputs)
    if (config.value !== undefined) {
      if (typeof config.value === 'string' || typeof config.value === 'number') {
        (element as HTMLInputElement).value = String(config.value);
      } else {
        (element as HTMLInputElement).value = String(config.value.value);
        const unsub = config.value.subscribe((newValue) => {
          (element as HTMLInputElement).value = String(newValue);
        });
        this.cleanups.push(unsub);
      }
    }
    
    // Handle checked (for checkboxes)
    if (config.checked !== undefined) {
      if (typeof config.checked === 'boolean') {
        (element as HTMLInputElement).checked = config.checked;
      } else {
        (element as HTMLInputElement).checked = config.checked.value;
        const unsub = config.checked.subscribe((newValue) => {
          (element as HTMLInputElement).checked = newValue;
        });
        this.cleanups.push(unsub);
      }
    }
    
    // Handle disabled
    if (config.disabled !== undefined) {
      if (typeof config.disabled === 'boolean') {
        (element as HTMLButtonElement | HTMLInputElement).disabled = config.disabled;
      } else {
        (element as HTMLButtonElement | HTMLInputElement).disabled = config.disabled.value;
        const unsub = config.disabled.subscribe((newValue) => {
          (element as HTMLButtonElement | HTMLInputElement).disabled = newValue;
        });
        this.cleanups.push(unsub);
      }
    }
    
    // If builder function provided, execute it and append children
    if (builder) {
      const childBuilder = new LayoutBuilder();
      builder(childBuilder);
      const childContainer = childBuilder.build();
      Array.from(childContainer.children).forEach(child => {
        element.appendChild(child);
      });
      this.cleanups.push(() => childBuilder.destroy());
    }
    
    this.children.push(element);
    return this;
  }

  /**
   * Creates a div container element.
   * 
   * @param {ElementConfig} config - Configuration for the div
   * @param {Function} [builder] - Optional builder function for nested content
   * @returns {LayoutBuilder} The builder instance for chaining
   * 
   * @example
   * ```typescript
   * // Simple div with text
   * ui.Div({ 
   *   className: "container",
   *   text: "Hello World"
   * })
   * 
   * // Div with nested children
   * ui.Div({ className: "flex gap-4" }, (ui) => {
   *   ui.Button({ text: "Click me" })
   *   ui.Text({ value: "Some text" })
   * })
   * 
   * // Reactive className
   * ui.Div({
   *   className: watch(isActive, active => 
   *     active ? "bg-blue-500" : "bg-gray-200"
   *   )
   * })
   * ```
   */
  Div(config: ElementConfig = {}, builder?: (ui: LayoutBuilder) => void) {
    return this.createElement('div', config, builder);
  }

  /**
   * Creates a button element.
   * 
   * @param {ElementConfig} config - Button configuration
   * @returns {LayoutBuilder} The builder instance for chaining
   * 
   * @example
   * ```typescript
   * // Simple button
   * ui.Button({
   *   text: "Click me",
   *   className: "bg-blue-500 text-white px-4 py-2 rounded",
   *   on: { click: () => console.log('clicked!') }
   * })
   * 
   * // Reactive text
   * ui.Button({
   *   text: watch(count, c => `Count: ${c}`),
   *   on: { click: () => count.value++ }
   * })
   * 
   * // Disabled state
   * ui.Button({
   *   text: "Submit",
   *   disabled: watch(isValid, v => !v),
   *   on: { click: () => handleSubmit() }
   * })
   * ```
   */
  Button(config: ElementConfig) {
    return this.createElement('button', config);
  }

  /**
   * Creates a text paragraph element.
   * 
   * @param {TextConfig} config - Text configuration
   * @returns {LayoutBuilder} The builder instance for chaining
   * 
   * @example
   * ```typescript
   * // Static text
   * ui.Text({ 
   *   value: "Hello World",
   *   className: "text-lg font-bold"
   * })
   * 
   * // Reactive text with ref
   * const name = ref("John")
   * ui.Text({ value: name })
   * 
   * // With formatter
   * const count = ref(42)
   * ui.Text({
   *   value: count,
   *   formatter: (v) => `Count: ${v}`,
   *   className: "text-2xl"
   * })
   * ```
   */
  Text(config: TextConfig) {
    const p = el("p").build();
    
    // Handle value (string or Ref)
    if (typeof config.value === 'string' || typeof config.value === 'number') {
      p.textContent = String(config.value);
    } else {
      const getText = (val: any) => {
        return config.formatter ? config.formatter(val) : String(val);
      };
      p.textContent = getText(config.value.value);
      const unsub = config.value.subscribe((newValue) => {
        p.textContent = getText(newValue);
      });
      this.cleanups.push(unsub);
    }
    
    this.applyEvents(p, config.on);
    this.applyClassName(p, config.className);
    this.children.push(p);
    return this;
  }

  /**
   * Creates an input element.
   * 
   * @param {ElementConfig} config - Input configuration
   * @returns {LayoutBuilder} The builder instance for chaining
   * 
   * @example
   * ```typescript
   * // Text input with two-way binding
   * const userInput = ref("")
   * ui.Input({
   *   type: "text",
   *   value: userInput,
   *   placeholder: "Enter text...",
   *   className: "border p-2 rounded",
   *   on: {
   *     input: (e) => userInput.value = (e.target as HTMLInputElement).value
   *   }
   * })
   * 
   * // Checkbox
   * const isChecked = ref(false)
   * ui.Input({
   *   type: "checkbox",
   *   checked: isChecked,
   *   on: {
   *     change: (e) => isChecked.value = (e.target as HTMLInputElement).checked
   *   }
   * })
   * ```
   */
  Input(config: ElementConfig) {
    return this.createElement('input', config);
  }

  /**
   * Renders a reactive list of items with efficient keyed diffing.
   * Only re-renders items that have changed.
   * 
   * @template T - The type of items in the list
   * @param {ListConfig<T>} config - List configuration
   * @returns {LayoutBuilder} The builder instance for chaining
   * 
   * @example
   * ```typescript
   * const todos = ref([
   *   { id: 1, text: ref("Buy milk"), done: ref(false) },
   *   { id: 2, text: ref("Walk dog"), done: ref(true) }
   * ])
   * 
   * ui.List({
   *   items: todos,
   *   className: "space-y-2",
   *   key: (todo) => todo.id, // Stable key for efficient updates
   *   render: (todo, index, ui) => {
   *     ui.Div({ className: "flex gap-2" }, (ui) => {
   *       ui.Input({
   *         type: "checkbox",
   *         checked: todo.done
   *       })
   *       ui.Text({ value: todo.text })
   *     })
   *   }
   * })
   * ```
   */
/**
   * OPTIMIZED LIST IMPLEMENTATION
   * Using for...of loops (faster than forEach)
   * Avoiding unnecessary array allocations
   * Enhanced with automatic reactive property conversion
   */

  List<T>(config: ListConfig<T>) {
  const container = el("div").build();
  this.applyClassName(container, config.className);

  // Cache: key → { element, builder, item }
  const cache = new Map<string | number, { 
    element: HTMLElement; 
    builder: LayoutBuilder;
    item: T; // Track item reference for change detection
  }>();
  
  const getKey = config.key || ((_item: T, index: number) => index);

  // Helper: Longest Increasing Subsequence (indexes of LIS)
  function lis(arr: number[]): number[] {
    const n = arr.length;
    const p: number[] = new Array(n);
    const result: number[] = [];
    let u: number, v: number;
    for (let i = 0; i < n; i++) {
      const ai = arr[i]!;
      if (ai === -1) { p[i] = -1; continue; }
      const lastIdx = result.length > 0 ? result[result.length - 1]! : -1;
      if (result.length === 0 || (lastIdx !== -1 && arr[lastIdx]! < ai)) {
        p[i] = lastIdx !== -1 ? lastIdx : -1;
        result.push(i);
        continue;
      }
      u = 0; v = result.length - 1;
      while (u < v) {
        const c = ((u + v) / 2) | 0;
        const rc = result[c]!;
        if (arr[rc]! < ai) u = c + 1; else v = c;
      }
      const ru = result[u]!;
      if (ai < arr[ru]!) {
        if (u > 0) p[i] = result[u - 1]!; else p[i] = -1;
        result[u] = i;
      }
    }
    let u2 = result.length;
    let v2 = result[u2 - 1]!;
    const lisIdx: number[] = new Array(u2);
    while (u2-- > 0) {
      lisIdx[u2] = v2;
      v2 = p[v2] ?? -1;
    }
    return lisIdx;
  }

  const render = () => {
    const newItems = config.items.value || [];
    const itemCount = newItems.length;
    
    // Quick exit for empty list
    if (itemCount === 0) {
      if (cache.size > 0) {
        for (const entry of cache.values()) {
          entry.element.remove();
          entry.builder.destroy();
        }
        cache.clear();
      }
      return;
    }
    
    // Build new keys array efficiently with duplicate detection
    const newKeys: (string | number)[] = new Array(itemCount);
    const seenKeys = new Set<string | number>();
    let dupWarned = false;
    for (let i = 0; i < itemCount; i++) {
      const item = newItems[i];
      if (item === undefined) {
        throw new Error(`Item at index ${i} is undefined`);
      }
      const key = getKey(item, i);
      if (key === undefined) {
        throw new Error(`Key at index ${i} is undefined`);
      }
      if (seenKeys.has(key) && !dupWarned) {
        dupWarned = true;
        console.warn('[auwla] List: duplicate keys detected; subsequent items overwrite earlier entries');
      }
      seenKeys.add(key);
      newKeys[i] = key;
    }
    
    // Create Set for fast lookup
    const newKeysSet = new Set(newKeys);
    
    // STEP 1: Remove stale entries
    const keysToRemove: (string | number)[] = [];
    for (const key of cache.keys()) {
      if (!newKeysSet.has(key)) {
        keysToRemove.push(key);
      }
    }
    
    if (keysToRemove.length > 0) {
      for (const key of keysToRemove) {
        const entry = cache.get(key);
        if (entry) {
          entry.element.remove();
          entry.builder.destroy();
          cache.delete(key);
        }
      }
    }
    
    // STEP 2: Detect scenario
    const hasRemovals = keysToRemove.length > 0;
    let hasAdditions = false;
    let hasChanges = false;
    
    // Check if any items are new or changed
    for (let i = 0; i < itemCount; i++) {
      const key = newKeys[i];
      const item = newItems[i];
      if (item === undefined) {
        throw new Error(`Item at index ${i} is undefined`);
      }
      if (key === undefined) {
        throw new Error(`Key at index ${i} is undefined`);
      }
      const entry = cache.get(key);
      
      if (!entry) {
        hasAdditions = true;
      } else if (entry.item !== item) {
        // Item reference changed - needs update
        hasChanges = true;
      }
    }
    
    // OPTIMIZATION: Reorder-only path (fastest)
    if (!hasRemovals && !hasAdditions && !hasChanges) {
      // Just reorder existing elements
      const fragment = document.createDocumentFragment();
      for (const key of newKeys) {
        if (key === undefined) {
          throw new Error(`Key is undefined in reorder path`);
        }
        const entry = cache.get(key);
        if (entry) {
          fragment.appendChild(entry.element);
        }
      }
      container.replaceChildren(fragment);
      return;
    }
    
    // STEP 3: Create/update elements and perform minimal moves
    const newCache = new Map<string | number, { element: HTMLElement; builder: LayoutBuilder; item: T }>();

    for (let i = 0; i < itemCount; i++) {
      const item = newItems[i];
      if (item === undefined) {
        throw new Error(`Item at index ${i} is undefined`);
      }
      const key = newKeys[i];
      if (key === undefined) {
        throw new Error(`Key at index ${i} is undefined`);
      }
      let entry = cache.get(key);
      if (!entry) {
        const itemBuilder = new LayoutBuilder();
        config.render(item, i, itemBuilder);
        const itemElement = itemBuilder.build();
        const firstChild = itemElement.children.item(0) as HTMLElement | null;
        const element = firstChild ?? itemElement;
        entry = { element, builder: itemBuilder, item };
      } else if (entry.item !== item) {
        entry.element.remove();
        entry.builder.destroy();
        const itemBuilder = new LayoutBuilder();
        config.render(item, i, itemBuilder);
        const itemElement = itemBuilder.build();
        const firstChild = itemElement.children.item(0) as HTMLElement | null;
        const element = firstChild ?? itemElement;
        entry = { element, builder: itemBuilder, item };
      }
      newCache.set(key, entry!);
    }

    // Initial mount optimization
    if (cache.size === 0) {
      const frag = document.createDocumentFragment();
      for (let i = 0; i < newKeys.length; i++) {
        const k = newKeys[i]!;
        const entry = newCache.get(k)!;
        frag.appendChild(entry.element);
      }
      container.replaceChildren(frag);
    } else {
      // Keyed reorder using LIS to minimize moves
      const oldKeys = Array.from(cache.keys());
      const oldIndexMap = new Map<string | number, number>();
      for (let i = 0; i < oldKeys.length; i++) {
        const ok = oldKeys[i]!;
        oldIndexMap.set(ok, i);
      }

      const pos = new Array(newKeys.length);
      for (let i = 0; i < newKeys.length; i++) {
        const k = newKeys[i]!;
        const idx = oldIndexMap.get(k);
        pos[i] = idx === undefined ? -1 : idx;
      }
      const lisIdx = lis(pos);
      const lisSet = new Set(lisIdx);

      // Move only nodes not in LIS or newly created
      for (let i = newKeys.length - 1; i >= 0; i--) {
        const k = newKeys[i]!;
        const entry = newCache.get(k)!;
        const node = entry.element;
        const anchor = i + 1 < newKeys.length ? newCache.get(newKeys[i + 1]!)!.element : null;
        if (pos[i] === -1 || !lisSet.has(i)) {
          container.insertBefore(node, anchor);
        }
      }
    }

    // Update cache
    cache.clear();
    for (const [k, v] of newCache.entries()) {
      cache.set(k, v);
    }
  };

  render();
  const unsub = config.items.subscribe(() => render());
  this.cleanups.push(unsub);

  this.children.push(container);
  return this;
}
  /**
   * Conditionally renders content based on a boolean ref.
   * Content is mounted/unmounted reactively when condition changes.
   * 
   * @param {Ref<boolean>} condition - Reactive boolean condition
   * @param {Function} thenBuilder - Builder function to run when true
   * @returns {Object} Object with Else method for alternative content
   * 
   * @example
   * ```typescript
   * const isLoggedIn = ref(false)
   * 
   * ui.When(isLoggedIn, (ui) => {
   *   ui.Text({ value: "Welcome back!" })
   *   ui.Button({ text: "Logout" })
   * }).Else((ui) => {
   *   ui.Text({ value: "Please login" })
   *   ui.Button({ text: "Login" })
   * })
   * 
   * // With computed condition
   * const hasItems = watch(items, arr => arr.length > 0)
   * ui.When(hasItems, (ui) => {
  *   ui.List({ items, ... })
  * })
  * ```
   *
   * @example
   * // JSX alternative:
   * // <When>
   * //   {isLoggedIn}={() => <button>Logout</button>}
   * //   {() => <>
   * //     <p>Please login</p>
   * //     <button>Login</button>
   * //   </>}
   * // </When>
  */
When(condition: Ref<boolean>, thenBuilder: (ui: LayoutBuilder) => void): { Else: (builder: (ui: LayoutBuilder) => void) => LayoutBuilder } {
    const container = el("div").build();
    let elseBuilder: ((ui: LayoutBuilder) => void) | null = null;
    let currentBuilder: LayoutBuilder | null = null;

    const render = () => {
      container.innerHTML = "";
      
      if (currentBuilder) {
        currentBuilder.destroy();
      }
      
      const builder = new LayoutBuilder();
      currentBuilder = builder;
      
      let hasContent = false; // NEW: Track if we are rendering anything
      
      if (condition.value && thenBuilder) {
        thenBuilder(builder);
        hasContent = true; // NEW: We have content
      } else if (!condition.value && elseBuilder) {
        elseBuilder(builder);
        hasContent = true; // NEW: We have content
      }
      // (The bug fix from before: no final 'else' block)
      
      const content = builder.build();
      Array.from(content.children).forEach(child => {
        container.appendChild(child);
      });

      // NEW: Hide the container if it has no content
      container.style.display = hasContent ? '' : 'none';
    };

    render(); // Initial render will now correctly hide if false
    const unsub = condition.subscribe(() => render());
    this.cleanups.push(unsub);

    this.children.push(container);
    
    // Return object with Else method
    return {
      Else: (builder: (ui: LayoutBuilder) => void) => {
        elseBuilder = builder;
        render(); // Re-render with else clause
        return this;
      }
    };
  }

  /**
   * Appends a pre-built component to the layout.
   * Useful for composing reusable components.
   * 
   * @param {HTMLElement} component - Component to append
   * @returns {LayoutBuilder} The builder instance for chaining
   * 
   * @example
   * ```typescript
   * function StatsCard(count: Ref<number>, label: string) {
   *   return Component((ui) => {
   *     ui.Div({ className: "card" }, (ui) => {
   *       ui.Text({ value: count })
   *       ui.Text({ value: label })
   *     })
   *   })
   * }
   * 
   * // Use it
   * ui.append(StatsCard(totalCount, "Total"))
   *   .append(StatsCard(activeCount, "Active"))
   * ```
   */
  append(component: HTMLElement) {
    this.children.push(component);
    return this;
  }

  /**
   * Cleans up all subscriptions and child builders.
   * Call this when the component is being destroyed to prevent memory leaks.
   * 
   * @example
   * ```typescript
   * const builder = new LayoutBuilder()
   * builder.Text({ value: reactiveRef })
   * 
   * // Later, when component is unmounted
   * builder.destroy()
   * ```
   */
  destroy() {
    this.cleanups.forEach(cleanup => cleanup());
    this.cleanups = [];
  }

  build(): HTMLElement {
    const container = document.createElement("div");
    this.children.forEach(child => container.appendChild(child));
    return container;
  }
}

/**
 * Creates a component with vertical layout (flexbox column).
 * 
 * @param {Function} fn - Builder function that defines the component UI
 * @returns {HTMLElement} The root element of the component
 * 
 * @example
 * ```typescript
 * const MyComponent = Component((ui) => {
 *   ui.Text({ value: "Title", className: "text-2xl font-bold" })
 *   ui.Button({ text: "Click me" })
 * })
 * 
 * document.body.appendChild(MyComponent)
 * ```
 *
 * @example
 * // JSX usage inside a Component
 * const App = Component(() => (
 *   <div className="container">
 *     <h1>Title</h1>
 *     <button onClick={() => alert('Hi!')}>Click me</button>
 *   </div>
 * ))
 */
export function Column(fn: (ui: LayoutBuilder) => void): HTMLElement {
  const builder = new LayoutBuilder();
  fn(builder);
  return builder.build();
}

/**
 * Creates a component with horizontal layout (flexbox row).
 *
 * @example
 * const Toolbar = Row((ui) => {
 *   ui.Button({ text: 'Save' })
 *   ui.Button({ text: 'Cancel' })
 * })
 */
export function Row(fn: (ui: LayoutBuilder) => void): HTMLElement {
  const builder = new LayoutBuilder();
  fn(builder);
  return builder.build();
}

/**
 * Creates a component with lifecycle support.
 * 
 * @param {Function} fn - Builder function that defines the component UI
 * @returns {HTMLElement} The root element of the component
 * 
 * @example
 * ```typescript
 * import { onMount, onUnmount } from "./lifecycle"
 * 
 * const App = Component((ui) => {
 *   onMount(() => {
 *     console.log('Mounted!')
 *     
 *     const interval = setInterval(() => console.log('tick'), 1000)
 *     
 *     // Return cleanup
 *     return () => clearInterval(interval)
 *   })
 *   
 *   ui.Div({ className: "container" }, (ui) => {
 *     ui.Text({ value: "Hello World" })
 *     ui.Button({ text: "Click me", on: { click: () => alert('Hi!') } })
 *   })
 * })
 * 
 * document.getElementById('app').appendChild(App)
 * ```
 */

// Dynamically add methods for all remaining HTML tags
HTML_TAGS.forEach(tag => {
  const methodName = tag.charAt(0).toUpperCase() + tag.slice(1);
  
  // Skip if method already exists
  if ((LayoutBuilder.prototype as any)[methodName]) return;
  
  (LayoutBuilder.prototype as any)[methodName] = function(
    config: ElementConfig = {}, 
    builder?: (ui: LayoutBuilder) => void
  ) {
    return this.createElement(tag, config, builder);
  };
});

// TypeScript declaration merging for dynamically added methods
export interface LayoutBuilder {
  Span(config?: ElementConfig, builder?: (ui: LayoutBuilder) => void): LayoutBuilder;
  P(config?: ElementConfig, builder?: (ui: LayoutBuilder) => void): LayoutBuilder;
  H1(config?: ElementConfig, builder?: (ui: LayoutBuilder) => void): LayoutBuilder;
  H2(config?: ElementConfig, builder?: (ui: LayoutBuilder) => void): LayoutBuilder;
  H3(config?: ElementConfig, builder?: (ui: LayoutBuilder) => void): LayoutBuilder;
  H4(config?: ElementConfig, builder?: (ui: LayoutBuilder) => void): LayoutBuilder;
  H5(config?: ElementConfig, builder?: (ui: LayoutBuilder) => void): LayoutBuilder;
  H6(config?: ElementConfig, builder?: (ui: LayoutBuilder) => void): LayoutBuilder;
  A(config?: ElementConfig, builder?: (ui: LayoutBuilder) => void): LayoutBuilder;
  Img(config?: ElementConfig, builder?: (ui: LayoutBuilder) => void): LayoutBuilder;
  Ul(config?: ElementConfig, builder?: (ui: LayoutBuilder) => void): LayoutBuilder;
  Ol(config?: ElementConfig, builder?: (ui: LayoutBuilder) => void): LayoutBuilder;
  Li(config?: ElementConfig, builder?: (ui: LayoutBuilder) => void): LayoutBuilder;
  Table(config?: ElementConfig, builder?: (ui: LayoutBuilder) => void): LayoutBuilder;
  Tr(config?: ElementConfig, builder?: (ui: LayoutBuilder) => void): LayoutBuilder;
  Td(config?: ElementConfig, builder?: (ui: LayoutBuilder) => void): LayoutBuilder;
  Th(config?: ElementConfig, builder?: (ui: LayoutBuilder) => void): LayoutBuilder;
  Form(config?: ElementConfig, builder?: (ui: LayoutBuilder) => void): LayoutBuilder;
  Label(config?: ElementConfig, builder?: (ui: LayoutBuilder) => void): LayoutBuilder;
  Select(config?: ElementConfig, builder?: (ui: LayoutBuilder) => void): LayoutBuilder;
  Option(config?: ElementConfig, builder?: (ui: LayoutBuilder) => void): LayoutBuilder;
  Textarea(config?: ElementConfig, builder?: (ui: LayoutBuilder) => void): LayoutBuilder;
  Header(config?: ElementConfig, builder?: (ui: LayoutBuilder) => void): LayoutBuilder;
  Footer(config?: ElementConfig, builder?: (ui: LayoutBuilder) => void): LayoutBuilder;
  Nav(config?: ElementConfig, builder?: (ui: LayoutBuilder) => void): LayoutBuilder;
  Main(config?: ElementConfig, builder?: (ui: LayoutBuilder) => void): LayoutBuilder;
  Section(config?: ElementConfig, builder?: (ui: LayoutBuilder) => void): LayoutBuilder;
  Article(config?: ElementConfig, builder?: (ui: LayoutBuilder) => void): LayoutBuilder;
  Aside(config?: ElementConfig, builder?: (ui: LayoutBuilder) => void): LayoutBuilder;
}


/**
 * Creates a component with lifecycle support.
 * 
 * @param {Function} fn - Builder function that defines the component UI
 * @returns {HTMLElement} The root element of the component
 * 
 * @example
 * ```typescript
 * import { onMount, onUnmount } from "./lifecycle"
 * 
 * const App = Component((ui) => {
 *   onMount(() => {
 *     console.log('Mounted!')
 *     
 *     const interval = setInterval(() => console.log('tick'), 1000)
 *     
 *     // Return cleanup
 *     return () => clearInterval(interval)
 *   })
 *   
 *   onUnmount(() => {
 *     console.log('Component unmounted')
 *   })
 *   
 *   ui.Div({ className: "container" }, (ui) => {
 *     ui.Text({ value: "Hello World" })
 *     ui.Button({ text: "Click me", on: { click: () => alert('Hi!') } })
 *   })
 * })
 * 
 * document.getElementById('app').appendChild(App)
 * ```
 *
 * @example
 * // JSX-based component with lifecycle
 * import { onMount, onUnmount } from './lifecycle'
 * const App = Component(() => {
 *   onMount(() => console.log('Mounted'))
 *   onUnmount(() => console.log('Unmounted'))
 *   return (
 *     <main>
 *       <h1>Hello World</h1>
 *       <button onClick={() => alert('Hi!')}>Click me</button>
 *     </main>
 *   )
 * })
 */
export function Component(fn: (ui: LayoutBuilder) => void): HTMLElement {
  const builder = new LayoutBuilder();
  const context = createComponentContext();
  
  // Set lifecycle context AND watch context
  setCurrentComponent(context);
  setWatchContext(context.cleanups); //  Enable auto-cleanup for watch()
  
  fn(builder);
  
  // Clear contexts after component setup
  setCurrentComponent(null);
  setWatchContext(null); //  Clear watch context
  
  const element = builder.build();
  
  // Store context and cleanup on element
  (element as any).__context = context;
  (element as any).__cleanup = () => {
    executeCleanup(context);
    builder.destroy();
  };
  
  // NOTE: Cleanup on removal will be handled by central observer.
  
  // Execute mount callbacks after element is added to DOM
  // Use two approaches for better coverage:
  
  // 1. Try immediate execution if already in DOM
  if (element.isConnected) {
    executeMountCallbacks(context);
  } else {
    // NOTE: Mount detection for later insertions handled by central observer.
  }
  
  return element;
}
// Class token helpers moved to shared dom-attrs.ts
