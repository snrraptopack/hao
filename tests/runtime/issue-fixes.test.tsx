/** @jsxImportSource auwla */
/**
 * Regression tests for the runtime issue-registry fixes (B4, B5, B6, B7, B20).
 * Each test names the issue it covers — see ARCHITECTURE.md.
 */
import { describe, expect, test, vi } from 'vitest';
import { createMemoApp, commit, __computed, __effect } from 'auwla';
import { runtimeState } from '../../src/runtime/state';
import { hydrateIslands, createIslandsApp } from '../../src/runtime/islands';

const tick = () => new Promise<void>((resolve) => queueMicrotask(resolve));
const macrotask = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

describe('B4 — mixed-case SVG tags patch instead of replace', () => {
  test('clipPath element is reused across re-renders', async () => {
    const root = document.createElement('div');

    function App() {
      let count = 0;
      return () => (
        <div>
          <svg width="10" height="10">
            <clipPath id="cp"><rect width="5" height="5" /></clipPath>
          </svg>
          <span id="c">{count}</span>
          <button id="inc" onClick={() => { count++; }}>+</button>
        </div>
      );
    }

    createMemoApp(root, <App />);
    const before = root.querySelector('[id="cp"]');
    expect(before).not.toBeNull();
    expect(before!.tagName).toBe('clipPath');

    (root.querySelector('#inc') as HTMLButtonElement).click();
    await tick();

    expect(root.querySelector('#c')!.textContent).toBe('1');
    // The bug lowercased "clipPath" → mismatch → replaceChild (new node).
    expect(root.querySelector('[id="cp"]')).toBe(before);
  });
});

describe('B5 — async handler settle does not clobber activeHandlerComponentId', () => {
  test('late-settling nested handler leaves the id null', async () => {
    const root = document.createElement('div');
    let btnB!: HTMLButtonElement;
    let resolveB!: () => void;
    const promiseB = new Promise<void>((resolve) => { resolveB = resolve; });

    function CompB() {
      return () => (
        <button id="b" ref={(el: any) => { btnB = el; }} onClick={() => promiseB}>B</button>
      );
    }
    function CompA() {
      return () => (
        <button id="a" onClick={() => { btnB.click(); }}>A</button>
      );
    }
    function App() {
      return () => <div><CompA /><CompB /></div>;
    }

    createMemoApp(root, <App />);
    (root.querySelector('#a') as HTMLButtonElement).click();
    // After the synchronous dispatch chain, the id must be restored to null.
    expect(runtimeState.activeHandlerComponentId).toBeNull();

    // B's promise settles late. The old deferred restore would re-assign
    // CompA's id (B's captured prevHandlerId) here — a stale leak.
    resolveB();
    await macrotask();
    expect(runtimeState.activeHandlerComponentId).toBeNull();
  });
});

describe('B6 — computed getters recompute on full commit()', () => {
  test('plain commit() dirties computed getters', async () => {
    const root = document.createElement('div');
    let bump!: () => void;

    function App() {
      let count = 0;
      const double = __computed(() => count * 2, ['count']);
      bump = () => { count++; };
      return () => <span id="v">{double()}</span>;
    }

    const app = createMemoApp(root, <App />);
    expect(root.querySelector('#v')!.textContent).toBe('0');

    bump();
    commit(); // full invalidation, no component handle
    await tick();

    expect(root.querySelector('#v')!.textContent).toBe('2');
    app.destroy();
  });
});

describe('B7 — destroy() clears global per-instance state', () => {
  test('computed getters, effects, and hosts are removed on destroy', () => {
    const root = document.createElement('div');

    const gettersBefore = new Set(runtimeState.computedGetters.keys());
    const effectsBefore = new Set(runtimeState.effects.keys());

    // Distinct name so the root fallback id (root/<Label>:0) is unique to
    // this test — see the component-ID fallback in runtime/component.ts.
    function DestroyApp() {
      const v = __computed(() => 1, ['v']);
      __effect(() => { /* registers an effect entry */ });
      return () => <span>{v()}</span>;
    }

    const app = createMemoApp(root, <DestroyApp />);
    const newGetterIds = [...runtimeState.computedGetters.keys()].filter((id) => !gettersBefore.has(id));
    const newEffectIds = [...runtimeState.effects.keys()].filter((id) => !effectsBefore.has(id));
    expect(newGetterIds.length).toBeGreaterThan(0);
    expect(newEffectIds.length).toBeGreaterThan(0);

    app.destroy();

    for (const id of newGetterIds) {
      expect(runtimeState.computedGetters.has(id)).toBe(false);
      expect(runtimeState.componentHosts.has(id)).toBe(false);
    }
    for (const id of newEffectIds) {
      expect(runtimeState.effects.has(id)).toBe(false);
    }
    expect((globalThis as any).__auwla_invalidate).toBeUndefined();
  });
});

describe('B20 — island hydration observer lifecycle', () => {
  function makeIsland(top: number): HTMLElement {
    const el = document.createElement('div');
    el.setAttribute('data-auwla-island', 'Counter');
    el.getBoundingClientRect = () => ({ top } as DOMRect);
    document.body.appendChild(el);
    return el;
  }

  function mockIntersectionObserver() {
    const instances: any[] = [];
    class MockIO {
      observed = new Set<Element>();
      disconnected = false;
      constructor(public cb: IntersectionObserverCallback, public options?: IntersectionObserverInit) {
        instances.push(this);
      }
      observe(el: Element) { this.observed.add(el); }
      unobserve(el: Element) { this.observed.delete(el); }
      disconnect() { this.disconnected = true; this.observed.clear(); }
    }
    (globalThis as any).IntersectionObserver = MockIO;
    return instances;
  }

  function IslandComp() {
    return () => 'island-content';
  }

  test('repeated hydrateIslands() shares one observer; destroy() disconnects it', () => {
    const instances = mockIntersectionObserver();
    const el = makeIsland(10000); // below the fold
    try {
      const getComponent = async () => IslandComp;
      hydrateIslands(getComponent);
      hydrateIslands(getComponent); // second render() call

      expect(instances.length).toBe(1);
      expect(instances[0].observed.size).toBe(1);

      const app = createIslandsApp(document.body);
      app.destroy();
      expect(instances[0].disconnected).toBe(true);
    } finally {
      el.remove();
      delete (globalThis as any).IntersectionObserver;
    }
  });

  test('observer auto-disconnects once all pending islands are hydrated', async () => {
    const instances = mockIntersectionObserver();
    const el = makeIsland(10000);
    try {
      hydrateIslands(async () => IslandComp);
      expect(instances.length).toBe(1);
      const observer = instances[0];
      expect(observer.disconnected).toBe(false);

      // Simulate the island scrolling into view.
      observer.cb([{ isIntersecting: true, target: el }], observer);
      await macrotask();
      await macrotask();

      expect(observer.disconnected).toBe(true);
      expect(el.textContent).toContain('island-content');
    } finally {
      el.remove();
      delete (globalThis as any).IntersectionObserver;
    }
  });
});
