import { describe, expect, test } from 'vitest';
import { renderToString } from '../../src/ssr';
import { h } from '../../src';
import { track, __resetTrackRegistry } from '../../src/events';
import { __cloneTemplate } from '../../src/compiler-runtime';
import type { RemoteFunction, ServerManifest } from '../../src/server/types';

function App() {
  return () => <div>Hello SSR</div>;
}

describe('renderToString', () => {
  test('renders a simple JSX component', async () => {
    const html = await renderToString(h(App));
    expect(html).toContain('<div>Hello SSR</div>');
  });

  test('renders nested elements and attributes', async () => {
    function Card() {
      return () => (
        <article class="card" data-id="1">
          <h1>Title</h1>
          <p>Body</p>
        </article>
      );
    }

    const html = await renderToString(h(Card));
    expect(html).toContain('<article class="card" data-id="1">');
    expect(html).toContain('<h1>Title</h1>');
    expect(html).toContain('<p>Body</p>');
    expect(html).toContain('</article>');
  });

  test('renders conditional content', async () => {
    function Toggle(props: { show: boolean }) {
      return () => (props.show ? <span>Visible</span> : <span>Hidden</span>);
    }

    const shown = await renderToString(h(Toggle, { show: true }));
    expect(shown).toContain('<span>Visible</span>');

    const hidden = await renderToString(h(Toggle, { show: false }));
    expect(hidden).toContain('<span>Hidden</span>');
  });

  test('renders compiled template clones', async () => {
    function CompiledCard() {
      return () => {
        const el = __cloneTemplate('<div class="card"><span>Title</span></div>');
        return el;
      };
    }

    const html = await renderToString(h(CompiledCard));
    expect(html).toContain('<div class="card"><span>Title</span></div>');
  });

  test('flushes async server functions during render', async () => {
    __resetTrackRegistry();

    const remoteFn: RemoteFunction = {
      __auwla_remote: true,
      method: 'GET',
      middleware: [],
      handler: async () => 'Hello from server',
    } as unknown as RemoteFunction;

    const manifest: ServerManifest = {
      'test.greet': {
        modulePath: 'dummy',
        exportName: 'greet',
        method: 'GET',
        routePattern: '',
        params: [],
        paramsType: '{}',
        argsType: [],
        returnType: 'string',
      },
    };

    function App() {
      const greet = track.get('test.greet');
      return () => <div>{greet.resolved ? greet.value : 'Loading'}</div>;
    }

    const html = await renderToString(h(App), {
      manifest,
      load: async () => ({ greet: remoteFn }),
    });

    expect(html).toContain('<div>Hello from server</div>');
  });
});
