/**
 * Regression tests for adapter issue-registry fixes — see ARCHITECTURE.md.
 */
import { describe, expect, test } from 'vitest';
import { resolve as resolvePath, sep } from 'node:path';
import { resolveStaticPath } from '../../src/adapters/bun';

describe('S5 — static file serving is contained to the static root', () => {
  const root = resolvePath('./dist');

  test('serves normal paths inside the root', () => {
    expect(resolveStaticPath('./dist', '/assets/app.js')).toBe(root + `${sep}assets${sep}app.js`);
    expect(resolveStaticPath('./dist', '/index.html')).toBe(root + `${sep}index.html`);
  });

  test('rejects plain traversal', () => {
    expect(resolveStaticPath('./dist', '/../secret.txt')).toBeNull();
    expect(resolveStaticPath('./dist', '/../../etc/passwd')).toBeNull();
  });

  test('rejects encoded traversal (%2e%2e)', () => {
    expect(resolveStaticPath('./dist', '/%2e%2e/%2e%2e/etc/passwd')).toBeNull();
    expect(resolveStaticPath('./dist', '/assets/%2e%2e/%2e%2e/secret')).toBeNull();
  });

  test('rejects NUL bytes and malformed escapes', () => {
    expect(resolveStaticPath('./dist', '/%00')).toBeNull();
    expect(resolveStaticPath('./dist', '/%zz')).toBeNull();
  });
});
