import { el,type EventHandlers, type EventMap } from "./createElement";
import type { Ref } from "./state";
import { setCurrentComponent } from "./lifecycle";

const HTML_TAGS = [
  'div', 'span', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'a', 'img', 'ul', 'ol', 'li', 'table', 'tr', 'td', 'th',
  'form', 'label', 'select', 'option', 'textarea',
  'header', 'footer', 'nav', 'main', 'section', 'article', 'aside',
  'button', 'input'
] as const;

type HTMLTag = typeof HTML_TAGS[number];

interface ElementConfig {
  text?: string | Ref<string>;
  on?: EventHandlers;
  id?: string;
  className?: string | Ref<string>;
  href?: string; // for <a>
  src?: string;  // for <img>
  alt?: string;  // for <img>
  type?: string; // for <input>, <button>
  placeholder?: string; // for <input>, <textarea>
  value?: string | Ref<string>;
  checked?: boolean | Ref<boolean>;
  disabled?: boolean | Ref<boolean>;
  [key: string]: any; // Allow any other HTML attributes
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
  value: string | Ref<any>;
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
      if (handler) el.addEventListener(eventName, handler as EventListener);
    });
  }

  private applyClassName(element: HTMLElement, className?: string | Ref<string>) {
    if (!className) return;
    
    if (typeof className === 'string') {
      element.className = className;
    } else {
      element.className = className.value;
      const unsub = className.subscribe((newValue) => {
        element.className = newValue;
      });
      this.cleanups.push(unsub); // Track for cleanup
    }
  }

  private applyAttribute(element: HTMLElement, attr: string, value: any) {
    if (value === undefined || value === null) return;
    
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      element.setAttribute(attr, String(value));
    } else {
      // It's a Ref
      element.setAttribute(attr, String(value.value));
      const unsub = value.subscribe((newValue: any) => {
        element.setAttribute(attr, String(newValue));
      });
      this.cleanups.push(unsub);
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
    
    // Apply text content (support both string and Ref<string>)
    if (config.text !== undefined) {
      if (typeof config.text === 'string') {
        element.textContent = config.text;
      } else {
        element.textContent = config.text.value;
        const unsub = config.text.subscribe((newValue) => {
          element.textContent = newValue;
        });
        this.cleanups.push(unsub);
      }
    }
    
    // Apply ID
    if (config.id) element.id = config.id;
    
    // Apply className (support both 'class' and 'className')
    const classValue = (config as any).class || config.className;
    this.applyClassName(element, classValue);
    
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
      if (typeof config.value === 'string') {
        (element as HTMLInputElement).value = config.value;
      } else {
        (element as HTMLInputElement).value = config.value.value;
        const unsub = config.value.subscribe((newValue) => {
          (element as HTMLInputElement).value = newValue;
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
    if (typeof config.value === 'string') {
      p.textContent = config.value;
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
  List<T>(config: ListConfig<T>) {
    const container = el("div").build();
    this.applyClassName(container, config.className);

    // Track elements by key for efficient updates with cleanup
    const elementMap = new Map<string | number, { element: HTMLElement; builder: LayoutBuilder }>();
    const getKey = config.key || ((_item: T, index: number) => index);

    const render = () => {
      const newItems = config.items.value || [];
      const newKeys = new Set(newItems.map((item, index) => getKey(item, index)));

      // 1. Remove elements that are no longer in the list
      elementMap.forEach((entry, key) => {
        if (!newKeys.has(key)) {
          entry.element.remove();
          entry.builder.destroy();
          elementMap.delete(key);
        }
      });

      // 2. Add, update, and move elements
      let lastElement: HTMLElement | null = null;
      newItems.forEach((item, index) => {
        const key = getKey(item, index);
        let entry = elementMap.get(key);

        if (!entry) {
          // Item is new: create it and add to map
          const itemBuilder = new LayoutBuilder();
          config.render(item, index, itemBuilder);
          const itemElement = itemBuilder.build();
          const element = (itemElement.children[0] as HTMLElement) || itemElement;
          entry = { element, builder: itemBuilder };
          elementMap.set(key, entry);
        }

        // Sync position: ensure the element is in the correct place
        const targetElement = entry.element;
        if (index === 0) {
          if (container.firstChild !== targetElement) {
            container.insertBefore(targetElement, container.firstChild);
          }
        } else if (lastElement && lastElement.nextSibling !== targetElement) {
          container.insertBefore(targetElement, lastElement.nextSibling);
        }
        
        lastElement = targetElement;
      });
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
   */
  When(condition: Ref<boolean>, thenBuilder: (ui: LayoutBuilder) => void): { Else: (builder: (ui: LayoutBuilder) => void) => LayoutBuilder } {
    const container = el("div").build();
    let elseBuilder: ((ui: LayoutBuilder) => void) | null = null;
    let currentBuilder: LayoutBuilder | null = null;

    const render = () => {
      container.innerHTML = "";
      
      // Cleanup previous builder
      if (currentBuilder) {
        currentBuilder.destroy();
      }
      
      const builder = new LayoutBuilder();
      currentBuilder = builder;
      
      if (condition.value && thenBuilder) {
        thenBuilder(builder);
      } else if (!condition.value && elseBuilder) {
        elseBuilder(builder);
      }
      
      const content = builder.build();
      Array.from(content.children).forEach(child => {
        container.appendChild(child);
      });
    };

    render();
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
 */
export function Column(fn: (ui: LayoutBuilder) => void): HTMLElement {
  const builder = new LayoutBuilder();
  fn(builder);
  return builder.build();
}

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

export function Component(fn: (ui: LayoutBuilder) => void): HTMLElement {
  const builder = new LayoutBuilder();
  const cleanupFns = new Set<() => void>();
  
  // Set lifecycle context
  setCurrentComponent(cleanupFns);
  fn(builder);
  setCurrentComponent(null);
  
  const element = builder.build();
  
  // Store cleanup on element for later
  (element as any).__cleanup = () => {
    cleanupFns.forEach(fn => fn());
    builder.destroy();
  };
  
  // Setup MutationObserver to detect removal from DOM
  if (typeof MutationObserver !== 'undefined') {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach(mutation => {
        mutation.removedNodes.forEach(node => {
          if (node === element || node.contains(element)) {
            (element as any).__cleanup?.();
            observer.disconnect();
          }
        });
      });
    });
    
    // Start observing when element is attached
    requestAnimationFrame(() => {
      if (element.parentElement) {
        observer.observe(element.parentElement, { 
          childList: true, 
          subtree: true 
        });
      }
    });
  }
  
  return element;
}