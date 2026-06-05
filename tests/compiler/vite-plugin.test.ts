import { describe, expect, test } from 'vitest';
import { auwla } from '../../src/vite';
import path from 'path';
import fs from 'fs';

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

  test('resolves design tokens from imported theme file at build time', () => {
    const plugin = auwla({ css: true });
    const code = `
      import { css } from 'auwla/css';
      import { theme } from './mock-theme';
      function Card() {
        return () => <div style={css({ padding: theme.spacing.md, color: theme.colors.primary })} />;
      }
    `;

    const result = transform(plugin, code, path.resolve(__dirname, 'Card.tsx'));
    const codeStr = result && 'code' in result ? result.code : '';
    
    expect(codeStr).toContain('pt_1rem');
    expect(codeStr).not.toContain('style=');
    
    const loadHook = plugin.load;
    if (typeof loadHook !== 'function') throw new Error('Expected load function hook');
    const cssContent = loadHook.call({} as any, '\0virtual:auwla.css') || '';
    expect(cssContent).toContain('.pt_1rem { padding-top: 1rem; }');
    expect(cssContent).toContain('color: #3b82f6;');
  });

  test('resolves theme color manipulations and length arithmetic', () => {
    const plugin = auwla({ css: true });
    const code = `
      import { css } from 'auwla/css';
      import { theme } from './mock-theme';
      function Card() {
        return () => (
          <div style={css({
            background: theme.colors.primary.lighten(0.1),
            paddingLeft: theme.spacing.md.add(css.px(4)),
            paddingRight: theme.spacing.md.add(css.vw(5))
          })} />
        );
      }
    `;

    transform(plugin, code, path.resolve(__dirname, 'Card.tsx'));
    
    const loadHook = plugin.load;
    if (typeof loadHook !== 'function') throw new Error('Expected load function hook');
    const cssContent = loadHook.call({} as any, '\0virtual:auwla.css') || '';
    
    expect(cssContent).toContain('background: #5aa2ff;');
    expect(cssContent).toContain('padding-left: calc(1rem + 4px)');
    expect(cssContent).toContain('padding-right: calc(1rem + 5vw)');
  });

  test('invalidates theme cache on HMR', () => {
    const plugin = auwla({ css: true });
    const themeFile = path.resolve(__dirname, 'mock-theme.ts');
    
    // 1. Initial compile
    const code = `
      import { css } from 'auwla/css';
      import { theme } from './mock-theme';
      function Card() {
        return () => <div style={css({ color: theme.colors.primary })} />;
      }
    `;
    transform(plugin, code, path.resolve(__dirname, 'Card.tsx'));
    
    const loadHook = plugin.load;
    if (typeof loadHook !== 'function') throw new Error('Expected load function hook');
    let cssContent = loadHook.call({} as any, '\0virtual:auwla.css') || '';
    expect(cssContent).toContain('color: #3b82f6;');

    // 2. Change mock-theme.ts on disk to a different color, but do not trigger HMR yet
    const originalThemeContent = fs.readFileSync(themeFile, 'utf8');
    const updatedThemeContent = originalThemeContent.replace('#3b82f6', '#ff0000');
    fs.writeFileSync(themeFile, updatedThemeContent, 'utf8');

    try {
      // 3. Transform again - should still use cached color (#3b82f6)
      transform(plugin, code, path.resolve(__dirname, 'Card.tsx'));
      cssContent = loadHook.call({} as any, '\0virtual:auwla.css') || '';
      expect(cssContent).toContain('color: #3b82f6;');

      // 4. Trigger HMR on the theme file
      const handleHotUpdate = plugin.handleHotUpdate;
      if (typeof handleHotUpdate !== 'function') throw new Error('Expected handleHotUpdate hook');
      handleHotUpdate.call({} as any, { file: themeFile, server: {} as any } as any);

      // 5. Transform again - should now use the updated color (#ff0000)
      transform(plugin, code, path.resolve(__dirname, 'Card.tsx'));
      cssContent = loadHook.call({} as any, '\0virtual:auwla.css') || '';
      expect(cssContent).toContain('color: #ff0000;');
    } finally {
      // 6. Restore original theme file
      fs.writeFileSync(themeFile, originalThemeContent, 'utf8');
    }
  });

  test('compiles css.when conditional blocks inside style and className attributes', () => {
    const plugin = auwla({ css: true });
    
    // Test css.when inside style attribute
    const codeStyle = `
      import { css } from 'auwla/css';
      function Card(props: { active: boolean }) {
        return () => <div style={css.when(props.active, { true: { background: 'blue' }, false: { background: 'gray' } })} />;
      }
    `;
    const resultStyle = transform(plugin, codeStyle, path.resolve(__dirname, 'CardStyle.tsx'));
    const codeStrStyle = resultStyle && 'code' in resultStyle ? resultStyle.code : '';
    expect(codeStrStyle).toContain('__setClass(el0, props.active ? "bg_blue" : "bg_gray")');
    expect(codeStrStyle).not.toContain('style=');

    // Test css.when inside className attribute with sibling class merging
    const codeClassName = `
      import { css } from 'auwla/css';
      function Card(props: { active: boolean }) {
        return () => <div class="btn" className={css.when(props.active, { true: { color: 'white' } })} />;
      }
    `;
    const resultClassName = transform(plugin, codeClassName, path.resolve(__dirname, 'CardClassName.tsx'));
    const codeStrClassName = resultClassName && 'code' in resultClassName ? resultClassName.code : '';
    expect(codeStrClassName).toContain('__setClass(el0, `btn ${props.active ? "text_white" : ""}`)');

    const loadHook = plugin.load;
    if (typeof loadHook !== 'function') throw new Error('Expected load function hook');
    const cssContent = loadHook.call({} as any, '\0virtual:auwla.css') || '';
    expect(cssContent).toContain('.bg_blue { background: blue; }');
    expect(cssContent).toContain('.bg_gray { background: gray; }');
    expect(cssContent).toContain('.text_white { color: white; }');
  });

  test('compiles css.match union blocks inside style and className attributes', () => {
    const plugin = auwla({ css: true });

    // Test css.match inside style attribute
    const codeStyle = `
      import { css } from 'auwla/css';
      function Card(props: { variant: 'primary' | 'secondary' }) {
        return () => <div style={css.match(props.variant, { primary: { background: 'blue' }, secondary: { background: 'gray' } })} />;
      }
    `;
    const resultStyle = transform(plugin, codeStyle, path.resolve(__dirname, 'CardStyle.tsx'));
    const codeStrStyle = resultStyle && 'code' in resultStyle ? resultStyle.code : '';
    expect(codeStrStyle).toContain('__setClass(el0, ({ "primary": "bg_blue", "secondary": "bg_gray" })[props.variant])');

    // Test css.match inside className attribute with sibling class merging
    const codeClassName = `
      import { css } from 'auwla/css';
      function Card(props: { variant: 'primary' | 'secondary' }) {
        return () => <div class="card" className={css.match(props.variant, { primary: { color: 'white' }, secondary: { color: 'black' } })} />;
      }
    `;
    const resultClassName = transform(plugin, codeClassName, path.resolve(__dirname, 'CardClassName.tsx'));
    const codeStrClassName = resultClassName && 'code' in resultClassName ? resultClassName.code : '';
    expect(codeStrClassName).toContain('__setClass(el0, `card ${({ "primary": "text_white", "secondary": "text_black" })[props.variant]}`)');
  });

  test('compiles dynamic properties inside nested selectors into CSS custom variables', () => {
    const plugin = auwla({ css: true });
    const code = `
      import { css } from 'auwla/css';
      function Button(props: { hoverColor: string }) {
        return () => (
          <button style={css({
            padding: '16px',
            ':hover': {
              color: props.hoverColor
            }
          })} />
        );
      }
    `;

    const result = transform(plugin, code, path.resolve(__dirname, 'Button.tsx'));
    const codeStr = result && 'code' in result ? result.code : '';
    
    // The hover color should be compiled to a class referencing a custom variable
    expect(codeStr).toContain('hover:text_var_-hover-color');
    // The variable mapping should be passed dynamically in inline style
    expect(codeStr).toContain('__setStyle(el0, "--hover-color", props.hoverColor);');

    const loadHook = plugin.load;
    if (typeof loadHook !== 'function') throw new Error('Expected load function hook');
    const cssContent = loadHook.call({} as any, '\0virtual:auwla.css') || '';
    
    // The generated CSS rule should exist in virtual CSS, mapped to the CSS variable
    expect(cssContent).toContain('.hover\\:text_var_-hover-color:hover { color: var(--hover-color); }');
  });
});
