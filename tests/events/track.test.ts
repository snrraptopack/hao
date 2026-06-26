import { describe, expect, test, beforeEach } from 'vitest';
import { createMemoApp, h } from '../../src';
import { track, pending, resolved, rejected, value, reason, cancel, __resetTrackRegistry } from '../../src/track';

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe('track', () => {
  beforeEach(() => {
    __resetTrackRegistry();
  });

  test('track handle reflects pending and resolved state', async () => {
    const root = document.createElement('div');
    let loadUser: ReturnType<typeof track>;

    function App() {
      loadUser = track('user', Promise.resolve('Alice'));

      return () => h('div', {}, loadUser.pending ? 'Loading...' : loadUser.value ?? '');
    }

    const app = createMemoApp(root, () => h(App as any));
    expect(root.textContent).toBe('Loading...');

    await sleep(10);

    expect(root.textContent).toBe('Alice');
    expect(loadUser!.resolved).toBe(true);
    expect(loadUser!.value).toBe('Alice');
  });

  test('track handle reflects rejected state', async () => {
    const root = document.createElement('div');
    let loadHandle: ReturnType<typeof track>;

    function App() {
      loadHandle = track('load', Promise.reject(new Error('fail')));

      return () => h('div', {}, loadHandle.rejected ? `Error: ${String(loadHandle.reason)}` : loadHandle.pending ? 'Loading...' : 'Done');
    }

    const app = createMemoApp(root, () => h(App as any));
    expect(root.textContent).toBe('Loading...');

    await sleep(10);

    expect(root.textContent).toBe('Error: Error: fail');
    expect(loadHandle!.rejected).toBe(true);
  });

  test('async function track starts immediately', async () => {
    const root = document.createElement('div');

    function App() {
      const search = track('search', async (signal) => {
        await sleep(50);
        return 'done';
      });

      return () => h('div', {}, search.pending ? 'pending' : search.value ?? '');
    }

    const app = createMemoApp(root, () => h(App as any));
    expect(root.textContent).toBe('pending');

    await sleep(60);

    expect(root.textContent).toBe('done');
  });

  test('calling track again with same name auto-cancels previous', async () => {
    const root = document.createElement('div');
    let aborted = false;

    function App() {
      const start = () => {
        track('search', async (signal) => {
          signal.addEventListener('abort', () => { aborted = true; });
          await sleep(100);
          if (signal.aborted) return;
          return 'completed';
        });
      };

      start();

      return () => h('div', {},
        h('button', { onClick: start }, 'Search'),
        h('span', {}, pending('search') ? 'pending' : value('search') ?? ''),
      );
    }

    const app = createMemoApp(root, () => h(App as any));
    const button = root.querySelector('button')!;

    expect(root.querySelector('span')!.textContent).toBe('pending');

    button.click();
    await sleep(10);
    expect(aborted).toBe(true);
    expect(root.querySelector('span')!.textContent).toBe('pending');
  });

  test('track handle cancel() aborts running operation', async () => {
    const root = document.createElement('div');
    let aborted = false;
    let slowHandle: ReturnType<typeof track>;

    function App() {
      slowHandle = track('slow', async (signal) => {
        signal.addEventListener('abort', () => { aborted = true; });
        await sleep(100);
      });

      return () => h('div', {},
        h('button', { onClick: () => slowHandle.cancel() }, 'Cancel'),
      );
    }

    const app = createMemoApp(root, () => h(App as any));
    const button = root.querySelector('button')!;

    button.click();
    await sleep(10);

    expect(aborted).toBe(true);
    expect(slowHandle!.pending).toBe(false);
  });

  test('event.pending() without name checks any pending track', async () => {
    const root = document.createElement('div');

    function App() {
      const t1 = track('a', new Promise((resolve) => setTimeout(resolve, 5)));
      const t2 = track('b', new Promise((resolve) => setTimeout(resolve, 5)));

      return () => h('div', {}, t1.pending || t2.pending ? 'any-loading' : 'all-done');
    }

    const app = createMemoApp(root, () => h(App as any));
    expect(root.textContent).toBe('any-loading');

    await sleep(50);

    expect(root.textContent).toBe('all-done');
  });

  test('track handle value getter returns resolved data', async () => {
    const root = document.createElement('div');

    function App() {
      const loadData = track('data', Promise.resolve({ name: 'Bob' }));
      return () => h('div', {}, loadData.resolved ? loadData.value?.name ?? 'none' : 'none');
    }

    const app = createMemoApp(root, () => h(App as any));
    expect(root.textContent).toBe('none');

    await sleep(10);

    expect(root.textContent).toBe('Bob');
  });

  test('tracks created inside event handlers associate with component', async () => {
    const root = document.createElement('div');

    function App() {
      return () => h('div', {},
        h('button', {
          onClick: () => {
            track('clickSave', sleep(20).then(() => 'saved'));
          },
        }, 'Save'),
        h('span', {}, pending('clickSave') ? 'saving' : value('clickSave') ?? 'idle'),
      );
    }

    const app = createMemoApp(root, () => h(App as any));
    const button = root.querySelector('button')!;

    button.click();
    await sleep(10);
    expect(root.querySelector('span')!.textContent).toBe('saving');

    await sleep(30);

    expect(root.querySelector('span')!.textContent).toBe('saved');
  });

  test('track created in setup auto-subscribes component', async () => {
    const root = document.createElement('div');
    let renderCount = 0;

    function App() {
      track('auto', Promise.resolve('ok'));
      return () => {
        renderCount++;
        return h('div', {}, 'app');
      };
    }

    createMemoApp(root, () => h(App as any));
    expect(renderCount).toBe(1);

    await sleep(10);

    expect(renderCount).toBe(2);
  });
});