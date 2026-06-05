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

  test('skips CSS extraction if css option is false/undefined', () => {
    const plugin = auwla();
    const code = `
      import { css } from 'auwla/css';
      function Card() {
        return () => <div style={css({ padding: css.px(16) })} />;
      }
    `;

    const result = transform(plugin, code, '/project/src/Card.tsx');
    const codeStr = result && 'code' in result ? result.code : '';
    expect(codeStr).toContain('css({');
    expect(codeStr).not.toContain('className="pt_16px');

    const resolveHook = plugin.resolveId;
    if (typeof resolveHook !== 'function') throw new Error('Expected resolveId function hook');
    expect(resolveHook.call({} as any, 'virtual:auwla.css', '', {})).toBeNull();
  });

  test('extracts CSS and updates virtual module if css option is true', () => {
    const plugin = auwla({ css: true });
    const code = `
      import { css } from 'auwla/css';
      function Card() {
        return () => <div style={css({ padding: css.px(16) })} />;
      }
    `;

    const result = transform(plugin, code, '/project/src/Card.tsx');
    const codeStr = result && 'code' in result ? result.code : '';
    expect(codeStr).toContain('class=\\"pt_16px pr_16px pb_16px pl_16px\\"');
    expect(codeStr).not.toContain('css({');

    const resolveHook = plugin.resolveId;
    if (typeof resolveHook !== 'function') throw new Error('Expected resolveId function hook');
    expect(resolveHook.call({} as any, 'virtual:auwla.css', '', {})).toBe('\0virtual:auwla.css');

    const loadHook = plugin.load;
    if (typeof loadHook !== 'function') throw new Error('Expected load function hook');
    const cssContent = loadHook.call({} as any, '\0virtual:auwla.css');
    expect(cssContent).toContain('.pt_16px { padding-top: 16px; }');
  });

  test('merges extracted CSS with existing className string literal', () => {
    const plugin = auwla({ css: true });
    const code = `
      import { css } from 'auwla/css';
      function Card() {
        return () => <div className="card-class" style={css({ padding: css.px(16) })} />;
      }
    `;

    const result = transform(plugin, code, '/project/src/Card.tsx');
    const codeStr = result && 'code' in result ? result.code : '';
    // JSX compiler bakes static classes into clone template
    expect(codeStr).toContain('class=\\"card-class pt_16px pr_16px pb_16px pl_16px\\"');
    expect(codeStr).not.toContain('style=');
  });

  test('merges extracted CSS with existing dynamic className expression', () => {
    const plugin = auwla({ css: true });
    const code = `
      import { css } from 'auwla/css';
      function Card(props: { active: boolean }) {
        return () => <div className={props.active ? 'active' : 'inactive'} style={css({ padding: css.px(16) })} />;
      }
    `;

    const result = transform(plugin, code, '/project/src/Card.tsx');
    const codeStr = result && 'code' in result ? result.code : '';
    // Should compile to dynamic setClass call combining the static classes and dynamic expression
    expect(codeStr).toContain('__setClass');
    expect(codeStr).toContain('pt_16px pr_16px pb_16px pl_16px');
    expect(codeStr).toContain('props.active ? \'active\' : \'inactive\'');
  });

  test('sorts media queries after base rules to preserve specificity cascade', () => {
    const plugin = auwla({ css: true });
    const code = `
      import { css } from 'auwla/css';
      function Card() {
        return () => <div style={css({ padding: { base: css.px(16), md: css.px(24) } })} />;
      }
    `;

    transform(plugin, code, '/project/src/Card.tsx');
    
    const loadHook = plugin.load;
    if (typeof loadHook !== 'function') throw new Error('Expected load function hook');
    const cssContent = loadHook.call({} as any, '\0virtual:auwla.css') || '';
    
    const baseIdx = cssContent.indexOf('.pt_16px { padding-top: 16px; }');
    const mediaIdx = cssContent.indexOf('@media (min-width: 768px)');
    
    expect(baseIdx).toBeGreaterThan(-1);
    expect(mediaIdx).toBeGreaterThan(-1);
    expect(baseIdx).toBeLessThan(mediaIdx);
  });

  test('garbage collects old style rules during HMR file updates', () => {
    const plugin = auwla({ css: true });
    
    const code1 = `
      import { css } from 'auwla/css';
      function Card() {
        return () => <div style={css({ padding: css.px(16) })} />;
      }
    `;
    transform(plugin, code1, '/project/src/Card.tsx');

    const code2 = `
      import { css } from 'auwla/css';
      function Card() {
        return () => <div style={css({ padding: css.px(24) })} />;
      }
    `;
    transform(plugin, code2, '/project/src/Card.tsx');

    const loadHook = plugin.load;
    if (typeof loadHook !== 'function') throw new Error('Expected load function hook');
    const cssContent = loadHook.call({} as any, '\0virtual:auwla.css') || '';

    expect(cssContent).toContain('.pt_24px { padding-top: 24px; }');
    expect(cssContent).not.toContain('.pt_16px { padding-top: 16px; }');
  });
});
