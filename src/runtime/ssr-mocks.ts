/**
 * @fileoverview Minimal DOM mocks that let the real client runtime run
 * unmodified in server (Node/Bun) environments.
 *
 * Installed by `runtime/ssr.ts` on import — only when no real DOM globals
 * exist (jsdom-free SSR), so client bundles are unaffected.
 */

export function installSsrDomMocks(): void {
if (typeof globalThis.Node === 'undefined') {
  class MockNode {
    static ELEMENT_NODE = 1;
    static ATTRIBUTE_NODE = 2;
    static TEXT_NODE = 3;
    static CDATA_SECTION_NODE = 4;
    static ENTITY_REFERENCE_NODE = 5;
    static ENTITY_NODE = 6;
    static PROCESSING_INSTRUCTION_NODE = 7;
    static COMMENT_NODE = 8;
    static DOCUMENT_NODE = 9;
    static DOCUMENT_TYPE_NODE = 10;
    static DOCUMENT_FRAGMENT_NODE = 11;
    static NOTATION_NODE = 12;

    nodeType!: number;
    textContent?: string;
    childNodes: any[] = [];
    props = {} as Record<string, any>;
    style = {} as Record<string, string>;

    get children() {
      return this.childNodes;
    }

    get classList() {
      const self = this;
      return {
        add(...names: string[]) {
          const current = self.getAttribute('class') || '';
          const parts = current.split(/\s+/).filter(Boolean);
          for (const name of names) {
            if (!parts.includes(name)) parts.push(name);
          }
          self.setAttribute('class', parts.join(' '));
        },
        remove(...names: string[]) {
          const current = self.getAttribute('class') || '';
          const parts = current.split(/\s+/).filter(Boolean);
          const filtered = parts.filter(p => !names.includes(p));
          self.setAttribute('class', filtered.join(' '));
        },
        contains(name: string) {
          const current = self.getAttribute('class') || '';
          return current.split(/\s+/).includes(name);
        },
        toggle(name: string, force?: boolean) {
          const has = this.contains(name);
          const want = force !== undefined ? force : !has;
          if (want) this.add(name);
          else this.remove(name);
          return want;
        }
      };
    }

    getAttribute(name: string) {
      const val = this.props[name];
      return val === undefined ? null : String(val);
    }

    setAttribute(name: string, value: any) {
      this.props[name] = value;
    }

    removeAttribute(name: string) {
      delete this.props[name];
    }

    hasAttribute(name: string) {
      return name in this.props;
    }

    appendChild(child: any) {
      this.childNodes.push(child);
      return child;
    }

    append(...children: any[]) {
      this.childNodes.push(...children);
    }

    prepend(...children: any[]) {
      this.childNodes.unshift(...children);
    }

    insertBefore(newChild: any, refChild: any) {
      if (!refChild) {
        this.appendChild(newChild);
        return newChild;
      }
      const index = this.childNodes.indexOf(refChild);
      if (index === -1) {
        this.appendChild(newChild);
      } else {
        this.childNodes.splice(index, 0, newChild);
      }
      return newChild;
    }

    removeChild(child: any) {
      const index = this.childNodes.indexOf(child);
      if (index !== -1) {
        this.childNodes.splice(index, 1);
      }
      return child;
    }

    replaceChild(newChild: any, oldChild: any) {
      const index = this.childNodes.indexOf(oldChild);
      if (index !== -1) {
        this.childNodes.splice(index, 1, newChild);
      }
      return oldChild;
    }
  }
  (globalThis as any).Node = MockNode;
}

if (typeof globalThis.SVGElement === 'undefined') {
  class MockSVGElement extends (globalThis as any).Node {}
  (globalThis as any).SVGElement = MockSVGElement;
}

if (typeof globalThis.DocumentFragment === 'undefined') {
  class MockDocumentFragment extends (globalThis as any).Node {}
  (globalThis as any).DocumentFragment = MockDocumentFragment;
}

if (typeof globalThis.document === 'undefined') {
  const SVG_TAGS = new Set([
    'svg', 'g', 'path', 'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon',
    'text', 'tspan', 'defs', 'use', 'clipPath', 'mask', 'pattern', 'linearGradient',
    'radialGradient', 'stop', 'image', 'foreignObject',
  ]);

  const createMockElement = (tag: string) => {
    const BaseClass = SVG_TAGS.has(tag) ? (globalThis as any).SVGElement : (globalThis as any).Node;

    class MockElement extends BaseClass {
      __auwlaSsr = true;
      nodeType = 1;
      tag = tag.toLowerCase();
      tagName = tag.toUpperCase();

      addEventListener() {}
    }

    const rawEl = new MockElement();

    return new Proxy(rawEl, {
      get(target: any, prop: string) {
        if (prop in target) return target[prop];
        if (prop === 'className') return target.props.class || '';
        return target.props[prop];
      },
      set(target: any, prop: string, value: any) {
        if (prop in target) {
          target[prop] = value;
        } else if (prop === 'className') {
          target.props.class = value;
        } else {
          target.props[prop] = value;
        }
        return true;
      }
    });
  };

  (globalThis as any).document = {
    createElement(tag: string) {
      if (tag === 'template') {
        class MockTemplate extends (globalThis as any).Node {
          nodeType = 1;
          tagName = 'TEMPLATE';
          content = new (globalThis as any).DocumentFragment();
        }
        return new MockTemplate();
      }
      return createMockElement(tag);
    },
    createElementNS(_ns: string, tag: string) {
      return createMockElement(tag);
    },
    createComment(data: string) {
      class MockComment extends (globalThis as any).Node {
        nodeType = 8;
        textContent = data;
      }
      return new MockComment();
    },
    createTextNode(text: string) {
      class MockText extends (globalThis as any).Node {
        nodeType = 3;
        textContent = text;
      }
      return new MockText();
    },
    createDocumentFragment() {
      class MockFragment extends (globalThis as any).DocumentFragment {
        nodeType = 11;
      }
      return new MockFragment();
    }
  };
}
}
