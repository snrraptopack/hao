import { describe, expect, test } from 'vitest';
import { createMemoApp, h } from '../../src';
import { event } from '../../src/events';

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe('event.track', () => {
  test('track handle reflects pending and resolved state', async () => {
    const root = document.createElement('div');
    let loadUser: ReturnType<typeof event.track>;

    function App() {
      let user = '';
      loadUser = event.track('user', Promise.resolve('Alice'));
      loadUser.then((data: string) => {
        user = data;
      });

      return () => h('div', {}, loadUser.pending ? 'Loading...' : user);
    }

    const app = createMemoApp(root, h(App as any));
    expect(root.textContent).toBe('Loading...');

    await sleep(10);
    app.render();

    expect(root.textContent).toBe('Alice');
    expect(loadUser!.resolved).toBe(true);
    expect(loadUser!.value).toBe('Alice');
  });

  test('track handle reflects rejected state', async () => {
    const root = document.createElement('div');
    let loadHandle: ReturnType<typeof event.track>;

    function App() {
      let error = '';
      loadHandle = event.track('load', Promise.reject(new Error('fail')));
      loadHandle.catch((err: Error) => {
        error = err.message;
      });

      return () => h('div', {}, loadHandle.rejected ? `Error: ${error}` : loadHandle.pending ? 'Loading...' : 'Done');
    }

    const app = createMemoApp(root, h(App as any));
    expect(root.textContent).toBe('Loading...');

    await sleep(10);
    app.render();

    expect(root.textContent).toBe('Error: fail');
    expect(loadHandle!.rejected).toBe(true);
  });

  test('async function track starts immediately', async () => {
    const root = document.createElement('div');

    function App() {
      let result = '';

      const search = event.track('search', async (signal) => {
        await sleep(50);
        result = 'done';
      });

      return () => h('div', {}, search.pending ? 'pending' : result);
    }

    const app = createMemoApp(root, h(App as any));
    expect(root.textContent).toBe('pending');

    await sleep(60);
    app.render();

    expect(root.textContent).toBe('done');
  });

  test('calling track again with same name auto-cancels previous', async () => {
    const root = document.createElement('div');
    let aborted = false;

    function App() {
      let result = '';

      const start = () => {
        event.track('search', async (signal) => {
          signal.addEventListener('abort', () => { aborted = true; });
          await sleep(100);
          if (signal.aborted) return;
          result = 'completed';
        });
      };

      start();

      return () => h('div', {},
        h('button', { onClick: start }, 'Search'),
        h('span', {}, event.pending('search') ? 'pending' : result),
      );
    }

    const app = createMemoApp(root, h(App as any));
    const button = root.querySelector('button')!;

    expect(root.querySelector('span')!.textContent).toBe('pending');

    button.click();
    app.render();
    expect(aborted).toBe(true);
    expect(root.querySelector('span')!.textContent).toBe('pending');
  });

  test('track handle cancel() aborts running operation', async () => {
    const root = document.createElement('div');
    let aborted = false;
    let slowHandle: ReturnType<typeof event.track>;

    function App() {
      slowHandle = event.track('slow', async (signal) => {
        signal.addEventListener('abort', () => { aborted = true; });
        await sleep(100);
      });

      return () => h('div', {},
        h('button', { onClick: () => slowHandle.cancel() }, 'Cancel'),
      );
    }

    const app = createMemoApp(root, h(App as any));
    const button = root.querySelector('button')!;

    button.click();
    app.render();

    expect(aborted).toBe(true);
    expect(slowHandle!.pending).toBe(false);
  });

  test('event.pending() without name checks any pending track', async () => {
    const root = document.createElement('div');

    function App() {
      const t1 = event.track('a', new Promise((resolve) => setTimeout(resolve, 5)));
      const t2 = event.track('b', new Promise((resolve) => setTimeout(resolve, 5)));

      return () => h('div', {}, t1.pending || t2.pending ? 'any-loading' : 'all-done');
    }

    const app = createMemoApp(root, h(App as any));
    expect(root.textContent).toBe('any-loading');

    await sleep(50);
    app.render();

    expect(root.textContent).toBe('all-done');
  });

  test('track handle value getter returns resolved data', async () => {
    const root = document.createElement('div');

    function App() {
      const loadData = event.track('data', Promise.resolve({ name: 'Bob' }));
      return () => h('div', {}, loadData.value?.name ?? 'none');
    }

    const app = createMemoApp(root, h(App as any));
    expect(root.textContent).toBe('none');

    await sleep(10);
    app.render();

    expect(root.textContent).toBe('Bob');
  });

  test('tracks created inside event handlers associate with component', async () => {
    const root = document.createElement('div');

    function App() {
      let status = 'idle';

      return () => h('div', {},
        h('button', {
          onClick: () => {
            event.track('clickSave', Promise.resolve().then(() => { status = 'saved'; }));
          },
        }, 'Save'),
        h('span', {}, event.pending('clickSave') ? 'saving' : status),
      );
    }

    const app = createMemoApp(root, h(App as any));
    const button = root.querySelector('button')!;

    button.click();
    app.render();
    expect(root.querySelector('span')!.textContent).toBe('saving');

    await sleep(10);
    app.render();

    expect(root.querySelector('span')!.textContent).toBe('saved');
  });
});
