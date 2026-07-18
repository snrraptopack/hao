/**
 * Regression tests for vite-router issue-registry fixes — see ARCHITECTURE.md.
 */
import { describe, expect, test } from 'vitest';
import { resolve } from 'node:path';
import { auwlaRouter } from '../../src/vite-router/router-plugin';

describe('B1 — generated client stubs call rpcCall with the correct argument order', () => {
  test('stub passes getCurrentRoutePath() as the third argument', () => {
    const fixturesRoot = resolve(__dirname, '../router/server-fixtures');
    const plugin = auwlaRouter({
      directories: { pages: 'pages', server: 'server', manifest: '.auwla-test' },
    }) as any;

    plugin.configResolved({ root: fixturesRoot });

    const id = resolve(fixturesRoot, 'pages/about.server.ts');
    const code: string = plugin.load.call({ environment: { name: 'client' } }, id);

    expect(code).toContain(`import { rpcCall, getCurrentRoutePath } from 'auwla/client';`);
    // Signature: rpcCall(key, args, routePath, options) — previously the
    // options object was passed in the routePath position (B1).
    expect(code).toContain(`rpcCall('about.getAbout', args, getCurrentRoutePath(), { method: 'GET' })`);
    expect(code).not.toContain(`rpcCall('about.getAbout', args, {`);
    expect(code).toContain(`getAbout.__auwla_key = 'about.getAbout';`);
  });
});
