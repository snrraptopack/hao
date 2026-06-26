import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderToString } from '../../src/runtime/ssr';
import { setRpcDispatcher, clearRpcDispatcher } from '../../src/runtime/rpc-dispatcher';
import { getParams, getRouted } from '../../src/router';
import type { ServerManifest } from '../../src/server/types';
import type { Route } from '../../src/router/types';

describe('renderToString', () => {
  let originalDocument: typeof globalThis.document;

  beforeEach(() => {
    originalDocument = globalThis.document;
  });

  afterEach(() => {
    (globalThis as any).document = originalDocument;
    clearRpcDispatcher();
  });

  it('renders a static route to HTML', async () => {
    (globalThis as any).document = undefined;

    function Home() {
      return () => <main><h1>Hello SSR</h1></main>;
    }

    const routes: Route[] = [{ path: '/', component: Home as any }];
    const manifest: ServerManifest = {};

    const { html, matched, data } = await renderToString('http://localhost/', routes, { manifest });

    expect(matched).not.toBeNull();
    expect(html).toBe('<main><h1>Hello SSR</h1></main><script>window.__AUWLA_DATA__ = {};</script>');
    expect(data).toEqual({});
  });

  it('returns 404 when no route matches', async () => {
    (globalThis as any).document = undefined;

    const routes: Route[] = [];
    const manifest: ServerManifest = {};

    const { html, matched, data } = await renderToString('http://localhost/nope', routes, { manifest });

    expect(matched).toBeNull();
    expect(html).toBe('<div>404 — page not found</div>');
    expect(data).toEqual({});
  });

  it('resolves routed data and injects it into the component', async () => {
    (globalThis as any).document = undefined;

    const manifest: ServerManifest = {
      'posts.getPost': {
        modulePath: '/fake/posts.server.ts',
        exportName: 'getPost',
        method: 'GET',
        routePattern: '/posts/:id',
        params: ['id'],
        paramsType: '{ id: string }',
        argsType: [],
        returnType: 'Post',
      },
    };

    const load = async () => ({
      async getPost() {
        return { id: '42', title: 'Server-rendered post' };
      },
    });

    function PostPage() {
      return () => {
        // During SSR, getParams and getRouted are seeded by renderToString.
        const { id } = getParams('/posts/:id');
        const data = getRouted();
        return <article><h1>{id}: {data?.value?.post?.title}</h1></article>;
      };
    }

    async function routed(ctx: any) {
      const { track } = await import('../../src/track');
      const post = await track.get('posts.getPost');
      return { post };
    }

    const routes: Route[] = [{ path: '/posts/:id', component: PostPage as any, routed: routed as any }];

    const { html, matched, data } = await renderToString('http://localhost/posts/42', routes, { manifest, load });

    expect(matched).not.toBeNull();
    expect(html).toContain('<article><h1>42: Server-rendered post</h1></article>');
    expect(html).toContain('<script>window.__AUWLA_DATA__ = {"__loader:/posts/42":{"post":{"id":"42","title":"Server-rendered post"}},"remote:posts.getPost":{"id":"42","title":"Server-rendered post"}};</script>');
    expect(data).toEqual({
      '__loader:/posts/42': { post: { id: '42', title: 'Server-rendered post' } },
      'remote:posts.getPost': { id: '42', title: 'Server-rendered post' }
    });
  });
})
