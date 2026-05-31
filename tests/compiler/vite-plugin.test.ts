import { describe, expect, test } from 'vitest';
import { auwla } from '../../src/vite';

function transform(plugin: ReturnType<typeof auwla>, code: string, id: string) {
  const hook = plugin.transform;
  if (typeof hook !== 'function') throw new Error('Expected function transform hook');
  return hook.call({} as any, code, id);
}

describe('auwla vite plugin', () => {
  test('compiles TSX files through the package plugin entry', () => {
    const plugin = auwla();
    const code = `
      function Counter() {
        let count = 0;
        return () => <button onClick={() => { count++; }}>{count}</button>;
      }
    `;

    const result = transform(plugin, code, '/project/src/Counter.tsx');

    expect(result).toEqual(expect.objectContaining({
      map: null,
    }));
    expect(result && 'code' in result ? result.code : '').toContain('__componentBlock');
  });

  test('skips unchanged files unless debug flag is enabled', () => {
    const code = 'export const value = 1;';

    expect(transform(auwla(), code, '/project/src/file.ts')).toBeNull();
    expect(transform(auwla({ debugFlag: true }), code, '/project/src/file.tsx')).toEqual({
      code: `globalThis.__AUWLA_COMPILED__ = false;\n${code}`,
      map: null,
    });
  });

  test('skips node_modules files', () => {
    const plugin = auwla({ debugFlag: true });
    const code = 'export const value = <span />;';

    expect(transform(plugin, code, '/project/node_modules/pkg/file.tsx')).toBeNull();
  });
});
