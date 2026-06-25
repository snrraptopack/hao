/** @jsxImportSource auwla */
import { describe, expect, test } from 'vitest';
import { createMemoApp } from 'auwla';

describe('nested component behavior', () => {
  test('nested component setup state survives across parent rerenders', async () => {
    const root = document.createElement('div');
    let parentSetupCalls = 0;
    let childSetupCalls = 0;

    function Counter() {
      childSetupCalls++;
      let count = 0;

      return () => (
        <button class="child" onClick={() => count++}>
          Child: {count}
        </button>
      );
    }

    function App() {
      parentSetupCalls++;
      let parentCount = 0;

      return () => (
        <section>
          <button class="parent" onClick={() => parentCount++}>
            Parent: {parentCount}
          </button>
          <Counter />
        </section>
      );
    }

    createMemoApp(root, <App />);

    expect(parentSetupCalls).toBe(1);
    expect(childSetupCalls).toBe(1);
    expect(root.textContent).toContain('Child: 0');

    root.querySelector<HTMLButtonElement>('.child')!.click();
    await new Promise<void>((resolve) => queueMicrotask(resolve));

    expect(root.textContent).toContain('Child: 1');

    root.querySelector<HTMLButtonElement>('.parent')!.click();
    await new Promise<void>((resolve) => queueMicrotask(resolve));

    expect(parentSetupCalls).toBe(1);
    expect(childSetupCalls).toBe(1);
    expect(root.textContent).toContain('Parent: 1');
    expect(root.textContent).toContain('Child: 1');
  });

  test('event rerenders only the component path that owns it', async () => {
    const root = document.createElement('div');
    let leftRenderCalls = 0;
    let rightRenderCalls = 0;

    function LeftCounter() {
      let count = 0;

      return () => {
        leftRenderCalls++;
        const doubled = count * 2;

        return (
          <button class="left" onClick={() => count++}>
            Left: {doubled}
          </button>
        );
      };
    }

    function RightCounter() {
      let count = 0;

      return () => {
        rightRenderCalls++;

        return (
          <button class="right" onClick={() => count++}>
            Right: {count}
          </button>
        );
      };
    }

    function App() {
      return () => (
        <section>
          <LeftCounter />
          <RightCounter />
        </section>
      );
    }

    createMemoApp(root, <App />);

    expect(leftRenderCalls).toBe(1);
    expect(rightRenderCalls).toBe(1);
    expect(root.querySelector('.left')!.textContent).toBe('Left: 0');

    root.querySelector<HTMLButtonElement>('.left')!.click();
    await new Promise<void>((resolve) => queueMicrotask(resolve));

    expect(leftRenderCalls).toBe(2);
    expect(rightRenderCalls).toBe(1);
    expect(root.querySelector('.left')!.textContent).toBe('Left: 2');
    expect(root.querySelector('.right')!.textContent).toBe('Right: 0');
  });

  test('sibling child events update their own UI before parent rerenders', async () => {
    const root = document.createElement('div');
    let childSetupCalls = 0;
    let childRenderCalls = 0;

    function ChildCounter(props: { label: string }) {
      childSetupCalls++;
      let count = 0;

      return () => {
        childRenderCalls++;

        return (
          <button class="secondary" onClick={() => count++}>
            {props.label}: {count}
          </button>
        );
      };
    }

    function NestedStateExample() {
      let parentCount = 0;

      return () => (
        <section class="panel">
          <h2>Nested Components</h2>
          <p>Child setup runs once and keeps its own closure state across parent rerenders.</p>
          <div class="row">
            <button class="parent" onClick={() => parentCount++}>Parent: {parentCount}</button>
            <ChildCounter label="Child A" />
            <ChildCounter label="Child B" />
          </div>
        </section>
      );
    }

    createMemoApp(root, <NestedStateExample />);

    expect(childSetupCalls).toBe(2);
    expect(childRenderCalls).toBe(2);
    expect(root.querySelectorAll('.secondary')[0]!.textContent).toBe('Child A: 0');

    root.querySelectorAll<HTMLButtonElement>('.secondary')[0]!.click();
    await new Promise<void>((resolve) => queueMicrotask(resolve));

    expect(childSetupCalls).toBe(2);
    expect(childRenderCalls).toBe(3);
    expect(root.querySelectorAll('.secondary')[0]!.textContent).toBe('Child A: 1');
    expect(root.querySelectorAll('.secondary')[1]!.textContent).toBe('Child B: 0');

    root.querySelector<HTMLButtonElement>('.parent')!.click();
    await new Promise<void>((resolve) => queueMicrotask(resolve));

    expect(childSetupCalls).toBe(2);
    expect(childRenderCalls).toBe(3);
    expect(root.querySelector('.parent')!.textContent).toBe('Parent: 1');
    expect(root.querySelectorAll('.secondary')[0]!.textContent).toBe('Child A: 1');
    expect(root.querySelectorAll('.secondary')[1]!.textContent).toBe('Child B: 0');
  });

  test('child instances survive when an unrelated sibling rerenders', async () => {
    const root = document.createElement('div');
    let childSetupCalls = 0;

    function ChildCounter(props: { label: string }) {
      childSetupCalls++;
      let count = 0;

      return () => (
        <button class="child" onClick={() => count++}>
          {props.label}: {count}
        </button>
      );
    }

    function Parent() {
      let parentCount = 0;

      return () => (
        <div class="parent-panel">
          <button class="parent" onClick={() => parentCount++}>Parent: {parentCount}</button>
          <ChildCounter label="Child" />
        </div>
      );
    }

    function Unrelated() {
      let n = 0;

      return () => (
        <button class="unrelated" onClick={() => n++}>
          Unrelated: {n}
        </button>
      );
    }

    function App() {
      return () => (
        <main>
          <Parent />
          <Unrelated />
        </main>
      );
    }

    createMemoApp(root, <App />);

    expect(childSetupCalls).toBe(1);

    root.querySelector<HTMLButtonElement>('.child')!.click();
    await new Promise<void>((resolve) => queueMicrotask(resolve));

    expect(childSetupCalls).toBe(1);
    expect(root.querySelector('.child')!.textContent).toBe('Child: 1');

    root.querySelector<HTMLButtonElement>('.unrelated')!.click();
    await new Promise<void>((resolve) => queueMicrotask(resolve));

    expect(childSetupCalls).toBe(1);
    expect(root.querySelector('.child')!.textContent).toBe('Child: 1');

    root.querySelector<HTMLButtonElement>('.child')!.click();
    await new Promise<void>((resolve) => queueMicrotask(resolve));

    expect(childSetupCalls).toBe(1);
    expect(root.querySelector('.child')!.textContent).toBe('Child: 2');
  });
});
