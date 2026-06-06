import { describe, expect, test } from 'vitest';
import { auwla } from '../../src/vite';
import path from 'path';
import fs from 'fs';

function transform(plugin: ReturnType<typeof auwla>, code: string, id: string) {
  const hook = plugin.transform;
  if (typeof hook !== 'function') throw new Error('Expected function transform hook');
  return hook.call({} as any, code, id);
}

describe('auwla vite plugin - css extraction', () => {
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

    // We resolve relatively from tests/compiler/Card.tsx (since mock-theme is in tests/compiler)
    const result = transform(plugin, code, path.resolve(__dirname, '../compiler/Card.tsx'));
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

    transform(plugin, code, path.resolve(__dirname, '../compiler/Card.tsx'));
    
    const loadHook = plugin.load;
    if (typeof loadHook !== 'function') throw new Error('Expected load function hook');
    const cssContent = loadHook.call({} as any, '\0virtual:auwla.css') || '';
    
    expect(cssContent).toContain('background: #5aa2ff;');
    expect(cssContent).toContain('padding-left: calc(1rem + 4px)');
    expect(cssContent).toContain('padding-right: calc(1rem + 5vw)');
  });

  test('invalidates theme cache on HMR', () => {
    const plugin = auwla({ css: true });
    const themeFile = path.resolve(__dirname, '../compiler/mock-theme.ts');
    
    // 1. Initial compile
    const code = `
      import { css } from 'auwla/css';
      import { theme } from './mock-theme';
      function Card() {
        return () => <div style={css({ color: theme.colors.primary })} />;
      }
    `;
    transform(plugin, code, path.resolve(__dirname, '../compiler/Card.tsx'));
    
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
      transform(plugin, code, path.resolve(__dirname, '../compiler/Card.tsx'));
      cssContent = loadHook.call({} as any, '\0virtual:auwla.css') || '';
      expect(cssContent).toContain('color: #3b82f6;');

      // 4. Trigger HMR on the theme file
      const handleHotUpdate = plugin.handleHotUpdate;
      if (typeof handleHotUpdate !== 'function') throw new Error('Expected handleHotUpdate hook');
      handleHotUpdate.call({} as any, { file: themeFile, server: {} as any } as any);

      // 5. Transform again - should now use the updated color (#ff0000)
      transform(plugin, code, path.resolve(__dirname, '../compiler/Card.tsx'));
      cssContent = loadHook.call({} as any, '\0virtual:auwla.css') || '';
      expect(cssContent).toContain('color: #ff0000;');
    } finally {
      // 6. Restore original theme file
      fs.writeFileSync(themeFile, originalThemeContent, 'utf8');
    }
  });

  test('compiles css.when conditional blocks inside style and className attributes', () => {
    const plugin = auwla({ css: true });
    
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

    const codeStyle = `
      import { css } from 'auwla/css';
      function Card(props: { variant: 'primary' | 'secondary' }) {
        return () => <div style={css.match(props.variant, { primary: { background: 'blue' }, secondary: { background: 'gray' } })} />;
      }
    `;
    const resultStyle = transform(plugin, codeStyle, path.resolve(__dirname, 'CardStyle.tsx'));
    const codeStrStyle = resultStyle && 'code' in resultStyle ? resultStyle.code : '';
    expect(codeStrStyle).toContain('__setClass(el0, ({ "primary": "bg_blue", "secondary": "bg_gray" })[props.variant])');

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
    
    expect(codeStr).toContain('hover:text_var_-hover-color');
    expect(codeStr).toContain('__setStyle(el0, "--hover-color", props.hoverColor);');

    const loadHook = plugin.load;
    if (typeof loadHook !== 'function') throw new Error('Expected load function hook');
    const cssContent = loadHook.call({} as any, '\0virtual:auwla.css') || '';
    
    expect(cssContent).toContain('.hover\\:text_var_-hover-color:hover { color: var(--hover-color); }');
  });

  test('extracts static parameterless css.define calls', () => {
    const plugin = auwla({ css: true });
    const code = `
      import { css } from 'auwla/css';
      const styles = css.define({
        padding: '16px',
        background: 'blue',
      });
      function Card() {
        return () => <div className={styles} />;
      }
    `;
    const result = transform(plugin, code, path.resolve(__dirname, 'Card.tsx'));
    const codeStr = result && 'code' in result ? result.code : '';
    expect(codeStr).toContain('styles = "pt_16px pr_16px pb_16px pl_16px bg_blue"');

    const loadHook = plugin.load;
    if (typeof loadHook !== 'function') throw new Error('Expected load function hook');
    const cssContent = loadHook.call({} as any, '\0virtual:auwla.css') || '';
    expect(cssContent).toContain('.pt_16px { padding-top: 16px; }');
  });

  test('extracts parameterized flat css.define factories', () => {
    const plugin = auwla({ css: true });
    const code = `
      import { css } from 'auwla/css';
      const cardStyle = css.define((props: { size: 'sm' | 'lg' }) => ({
        padding: css.match(props.size, { sm: '8px', lg: '24px' }),
        borderRadius: '8px',
      }));
      function Card(props: { size: 'sm' | 'lg' }) {
        return () => <div style={cardStyle({ size: props.size })} />;
      }
    `;
    const result = transform(plugin, code, path.resolve(__dirname, 'Card.tsx'));
    const codeStr = result && 'code' in result ? result.code : '';
    
    expect(codeStr).toContain('__setClass(el0, cardStyle({ size: props.size }))');
    expect(codeStr).not.toContain('style=');
    expect(codeStr).toContain('"size=sm"');
    expect(codeStr).toContain('"pt_8px pr_8px pb_8px pl_8px rounded-tl_8px rounded-tr_8px rounded-br_8px rounded-bl_8px"');

    const loadHook = plugin.load;
    if (typeof loadHook !== 'function') throw new Error('Expected load function hook');
    const cssContent = loadHook.call({} as any, '\0virtual:auwla.css') || '';
    expect(cssContent).toContain('.pt_8px { padding-top: 8px; }');
    expect(cssContent).toContain('.pt_24px { padding-top: 24px; }');
  });

  test('extracts parameterized nested element-group css.define factories', () => {
    const plugin = auwla({ css: true });
    const code = `
      import { css } from 'auwla/css';
      const buttonStyles = css.define((props: { variant: 'primary' | 'secondary' }) => ({
        root: {
          background: css.match(props.variant, { primary: 'blue', secondary: 'transparent' }),
        },
      }));
      function Button(props: { variant: 'primary' | 'secondary' }) {
        return () => <button style={buttonStyles.root({ variant: props.variant })} />;
      }
    `;
    const result = transform(plugin, code, path.resolve(__dirname, 'Button.tsx'));
    const codeStr = result && 'code' in result ? result.code : '';

    expect(codeStr).toContain('__setClass(el0, buttonStyles.root({ variant: props.variant }))');
    expect(codeStr).not.toContain('style=');
    expect(codeStr).toContain('"variant=primary"');
    expect(codeStr).toContain('"bg_blue"');
    expect(codeStr).toContain('"bg_transparent"');
  });

  test('supports cross-file extraction of css.define style imports', () => {
    const plugin = auwla({ css: true });
    
    // We create the style file relative to tests/css/compiler
    const styleFile = path.resolve(__dirname, 'test-btn.styles.ts');
    const styleContent = `
      import { css } from 'auwla/css';
      export const btnStyles = css.define((props: { size: 'sm' | 'lg' }) => ({
        root: {
          padding: css.match(props.size, { sm: '8px', lg: '24px' }),
        }
      }));
    `;
    fs.writeFileSync(styleFile, styleContent, 'utf8');

    try {
      transform(plugin, styleContent, styleFile);

      const componentCode = `
        import { css } from 'auwla/css';
        import { btnStyles } from './test-btn.styles';
        function Button(props: { size: 'sm' | 'lg' }) {
          return () => <button style={btnStyles.root({ size: props.size })} />;
        }
      `;
      const result = transform(plugin, componentCode, path.resolve(__dirname, 'Button.tsx'));
      const codeStr = result && 'code' in result ? result.code : '';

      expect(codeStr).toContain('__setClass(el0, btnStyles.root({ size: props.size }))');
      expect(codeStr).not.toContain('style=');
    } finally {
      if (fs.existsSync(styleFile)) {
        fs.unlinkSync(styleFile);
      }
    }
  });

  test('supports prefix-less CSS helpers (define, px, color, when, match, merge)', () => {
    const plugin = auwla({ css: true });
    const code = `
      import { define, px, color, when, match, merge } from 'auwla/css';
      const styles = define({
        padding: px(16),
        color: color('#ff0000'),
      });
      const activeStyles = define((props: { active: boolean }) => ({
        ...when(props.active, {
          true: { background: color('#0000ff') }
        })
      }));
      function Card(props: { active: boolean }) {
        return () => <div className={styles} style={activeStyles({ active: props.active })} />;
      }
    `;
    const result = transform(plugin, code, path.resolve(__dirname, 'Card.tsx'));
    const codeStr = result && 'code' in result ? result.code : '';
    expect(codeStr).toContain('styles = "pt_16px pr_16px pb_16px pl_16px text_ff0000"');
    expect(codeStr).toContain('activeStyles({ active: props.active })');
    expect(codeStr).toContain('"active=true"');
    expect(codeStr).toContain('"bg_0000ff"');

    const loadHook = plugin.load;
    if (typeof loadHook !== 'function') throw new Error('Expected load function hook');
    const cssContent = loadHook.call({} as any, '\0virtual:auwla.css') || '';
    expect(cssContent).toContain('.pt_16px { padding-top: 16px; }');
    expect(cssContent).toContain('.text_ff0000 { color: #ff0000; }');
    expect(cssContent).toContain('.bg_0000ff { background: #0000ff; }');
  });

  test('supports object spreads and merge call evaluation inside define factories', () => {
    const plugin = auwla({ css: true });
    const code = `
      import { define, px, color, when, merge } from 'auwla/css';
      const buttonStyles = define((props: { active: boolean }) => merge(
        { borderRadius: px(4) },
        when(props.active, {
          true: { color: color('#fff'), background: color('#00f') },
          false: { color: color('#000'), background: color('#fff') }
        })
      ));
      function Button(props: { active: boolean }) {
        return () => <button style={buttonStyles({ active: props.active })} />;
      }
    `;
    const result = transform(plugin, code, path.resolve(__dirname, 'Button.tsx'));
    const codeStr = result && 'code' in result ? result.code : '';
    expect(codeStr).toContain('buttonStyles({ active: props.active })');
    expect(codeStr).toContain('"active=true"');
    expect(codeStr).toContain('"rounded-tl_4px rounded-tr_4px rounded-br_4px rounded-bl_4px text_ffffff bg_0000ff"');
    expect(codeStr).toContain('"active=false"');
    expect(codeStr).toContain('"rounded-tl_4px rounded-tr_4px rounded-br_4px rounded-bl_4px text_000000 bg_ffffff"');
  });

  test('supports compile-time evaluation of color.palette', () => {
    const plugin = auwla({ css: true });
    const code = `
      import { define, color } from 'auwla/css';
      const brand = color.palette('#3b82f6');
      const styles = define({
        color: brand[50],
        background: brand[900],
      });
      function Card() {
        return () => <div className={styles} />;
      }
    `;
    const result = transform(plugin, code, path.resolve(__dirname, 'Card.tsx'));
    const codeStr = result && 'code' in result ? result.code : '';
    expect(codeStr).toContain('styles = "text_');
    expect(codeStr).toContain('bg_');

    const loadHook = plugin.load;
    if (typeof loadHook !== 'function') throw new Error('Expected load function hook');
    const cssContent = loadHook.call({} as any, '\0virtual:auwla.css') || '';
    expect(cssContent).toContain('.text_');
    expect(cssContent).toContain('.bg_');
  });
});

