/** @jsxImportSource auwla */
/**
 * Regression tests for events issue-registry fixes — see ARCHITECTURE.md.
 */
import { describe, expect, test } from 'vitest';
import { createMemoApp } from 'auwla';
import { event } from '../../src/events';
import '../../src/events/intersect';

class MockIO {
  static instances: MockIO[] = [];
  observed = new Set<Element>();
  disconnected = false;
  constructor(public cb: IntersectionObserverCallback, public options?: IntersectionObserverInit) {
    MockIO.instances.push(this);
  }
  observe(el: Element) { this.observed.add(el); }
  unobserve(el: Element) { this.observed.delete(el); }
  disconnect() { this.disconnected = true; }
}

describe('B18 — intersection observers are torn down when the component unmounts', () => {
  test('the abort signal that unbinds listeners also releases the observer', async () => {
    MockIO.instances = [];
    (globalThis as any).IntersectionObserver = MockIO;
    try {
      const root = document.createElement('div');

      function Box() {
        return () => <div class="box" onIntersect={event.intersect().handler(() => {})} />;
      }
      function App() {
        let show = true;
        return () => (
          <div>
            {show && <Box />}
            <button id="toggle" onClick={() => { show = false; }}>x</button>
          </div>
        );
      }

      createMemoApp(root, <App />);
      expect(MockIO.instances.length).toBe(1);
      expect(MockIO.instances[0]!.observed.size).toBe(1);

      // Unmount Box — the runtime aborts its listener signal; the observer
      // must be torn down too (previously it kept observing the detached div).
      (root.querySelector('#toggle') as HTMLButtonElement).click();
      await new Promise<void>((resolve) => queueMicrotask(resolve));

      expect(root.querySelector('.box')).toBeNull();
      expect(MockIO.instances[0]!.observed.size).toBe(0);
    } finally {
      delete (globalThis as any).IntersectionObserver;
    }
  });
});
