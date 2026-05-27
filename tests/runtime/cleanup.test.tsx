/** @jsxImportSource auwla */
import { describe, expect, test } from 'vitest';
import { createMemoApp, cleanup } from 'auwla';

describe('cleanup & destroy', () => {
  test('cleanup runs when component is removed from tree', async () => {
    const root = document.createElement('div');
    const cleanupLog: string[] = [];

    function Timer() {
      cleanup(() => cleanupLog.push('timer-cleared'));
      return () => <span class="timer">Running</span>;
    }

    function App() {
      let showTimer = true;
      return () => (
        <div>
          {showTimer && <Timer />}
          <button onClick={() => { showTimer = false; }}>Stop</button>
        </div>
      );
    }

    createMemoApp(root, <App />);
    expect(root.querySelector('.timer')!.textContent).toBe('Running');
    expect(cleanupLog).toEqual([]);

    root.querySelector('button')!.click();
    await new Promise<void>((resolve) => queueMicrotask(resolve));

    expect(root.querySelector('.timer')).toBeNull();
    expect(cleanupLog).toEqual(['timer-cleared']);
  });

  test('cleanup runs when component type changes at same position', () => {
    const root = document.createElement('div');
    const cleanupLog: string[] = [];
    let useB = false;

    function CompA() {
      cleanup(() => cleanupLog.push('A-cleanup'));
      return () => <span>A</span>;
    }

    function CompB() {
      cleanup(() => cleanupLog.push('B-cleanup'));
      return () => <span>B</span>;
    }

    function App() {
      return () => <div>{useB ? <CompB /> : <CompA />}</div>;
    }

    const app = createMemoApp(root, <App />);
    expect(root.textContent).toBe('A');
    expect(cleanupLog).toEqual([]);

    useB = true;
    app.render();

    expect(root.textContent).toBe('B');
    expect(cleanupLog).toEqual(['A-cleanup']);
  });

  test('multiple cleanups per component all fire', async () => {
    const root = document.createElement('div');
    const cleanupLog: string[] = [];

    function MultiResource() {
      cleanup(() => cleanupLog.push('ws-closed'));
      cleanup(() => cleanupLog.push('timer-cleared'));
      cleanup(() => cleanupLog.push('listener-removed'));
      return () => <span>Active</span>;
    }

    function App() {
      let show = true;
      return () => (
        <div>
          {show && <MultiResource />}
          <button onClick={() => { show = false; }}>Remove</button>
        </div>
      );
    }

    createMemoApp(root, <App />);
    expect(cleanupLog).toEqual([]);

    root.querySelector('button')!.click();
    await new Promise<void>((resolve) => queueMicrotask(resolve));

    expect(cleanupLog).toEqual(['ws-closed', 'timer-cleared', 'listener-removed']);
  });

  test('destroy() runs all cleanups depth-first (children before parents)', () => {
    const root = document.createElement('div');
    const cleanupLog: string[] = [];

    function GrandChild() {
      cleanup(() => cleanupLog.push('grandchild'));
      return () => <span>GC</span>;
    }

    function Child() {
      cleanup(() => cleanupLog.push('child'));
      return () => <div><GrandChild /></div>;
    }

    function Parent() {
      cleanup(() => cleanupLog.push('parent'));
      return () => <div><Child /></div>;
    }

    function App() {
      return () => <Parent />;
    }

    const app = createMemoApp(root, <App />);
    expect(cleanupLog).toEqual([]);

    app.destroy();

    expect(cleanupLog.indexOf('grandchild')).toBeLessThan(cleanupLog.indexOf('child'));
    expect(cleanupLog.indexOf('child')).toBeLessThan(cleanupLog.indexOf('parent'));
    expect(cleanupLog).toHaveLength(3);
  });

  test('children clean up before parents when removed from tree', async () => {
    const root = document.createElement('div');
    const cleanupLog: string[] = [];

    function Inner() {
      cleanup(() => cleanupLog.push('inner'));
      return () => <span>Inner</span>;
    }

    function Outer() {
      cleanup(() => cleanupLog.push('outer'));
      return () => <div><Inner /></div>;
    }

    function App() {
      let show = true;
      return () => (
        <div>
          {show && <Outer />}
          <button onClick={() => { show = false; }}>Remove</button>
        </div>
      );
    }

    createMemoApp(root, <App />);
    expect(cleanupLog).toEqual([]);

    root.querySelector('button')!.click();
    await new Promise<void>((resolve) => queueMicrotask(resolve));

    expect(cleanupLog).toEqual(['inner', 'outer']);
  });

  test('top-level component cleanup runs on destroy', () => {
    const root = document.createElement('div');
    const cleanupLog: string[] = [];

    function TopLevel() {
      cleanup(() => cleanupLog.push('top-level'));
      return () => <div>Hello</div>;
    }

    const app = createMemoApp(root, <TopLevel />);
    expect(root.textContent).toBe('Hello');
    expect(cleanupLog).toEqual([]);

    app.destroy();
    expect(cleanupLog).toEqual(['top-level']);
  });
});
