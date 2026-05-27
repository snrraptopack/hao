/** @jsxImportSource auwla */
import { describe, expect, test } from 'vitest';
import { createMemoApp, component, commit, emit } from 'auwla';

describe('component communication', () => {
  test('emit bubbles payload to parent custom listener', async () => {
    const root = document.createElement('div');
    let received: { id: string; status: string } | null = null;

    function DeleteButton(props: { userId: string }) {
      const self = component();

      return () => (
        <button onClick={() => {
          emit(self, 'userDeleted', { id: props.userId, status: 'success' });
        }}>
          Delete User
        </button>
      );
    }

    function Dashboard() {
      let message = 'Waiting';

      return () => (
        <main on:userDeleted={(data: { id: string; status: string }) => {
          received = data;
          message = `Deleted ${data.id}: ${data.status}`;
        }}>
          <span class="message">{message}</span>
          <DeleteButton userId="123" />
        </main>
      );
    }

    createMemoApp(root, <Dashboard />);
    root.querySelector('button')!.click();
    await new Promise<void>((resolve) => queueMicrotask(resolve));

    expect(received).toEqual({ id: '123', status: 'success' });
    expect(root.querySelector('.message')!.textContent).toBe('Deleted 123: success');
  });

  test('commit(handle) re-renders only the target component path', async () => {
    const root = document.createElement('div');
    let siblingRenderCalls = 0;
    let childRenderCalls = 0;

    function Child() {
      const self = component();
      let count = 0;

      queueMicrotask(() => {
        count = 42;
        commit(self);
      });

      return () => {
        childRenderCalls++;
        return <span class="child-val">{count}</span>;
      };
    }

    function Sibling() {
      return () => {
        siblingRenderCalls++;
        return <span class="sibling-val">Sibling</span>;
      };
    }

    function App() {
      return () => (
        <div>
          <Child />
          <Sibling />
        </div>
      );
    }

    createMemoApp(root, <App />);

    expect(childRenderCalls).toBe(1);
    expect(siblingRenderCalls).toBe(1);
    expect(root.querySelector('.child-val')!.textContent).toBe('0');

    await new Promise<void>((resolve) => queueMicrotask(resolve));

    expect(childRenderCalls).toBe(2);
    expect(root.querySelector('.child-val')!.textContent).toBe('42');
    expect(siblingRenderCalls).toBe(1);
  });

  test('commit(h1, h2) re-renders multiple specific components', async () => {
    const root = document.createElement('div');
    let aRenderCalls = 0;
    let bRenderCalls = 0;
    let cRenderCalls = 0;

    let handleA: ReturnType<typeof component>;
    let handleB: ReturnType<typeof component>;

    function CompA() {
      handleA = component();
      let val = 'a0';
      return () => { aRenderCalls++; return <span class="a">{val}</span>; };
    }

    function CompB() {
      handleB = component();
      let val = 'b0';
      return () => { bRenderCalls++; return <span class="b">{val}</span>; };
    }

    function CompC() {
      return () => { cRenderCalls++; return <span class="c">c</span>; };
    }

    function App() {
      return () => (
        <div>
          <CompA />
          <CompB />
          <CompC />
        </div>
      );
    }

    createMemoApp(root, <App />);

    expect(aRenderCalls).toBe(1);
    expect(bRenderCalls).toBe(1);
    expect(cRenderCalls).toBe(1);

    commit(handleA!, handleB!);
    await new Promise<void>((resolve) => queueMicrotask(resolve));

    expect(aRenderCalls).toBe(2);
    expect(bRenderCalls).toBe(2);
    expect(cRenderCalls).toBe(1);
  });
});
