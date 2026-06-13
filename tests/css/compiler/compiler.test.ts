import { describe, it, expect } from 'vitest';
import { compileStyle } from '../../../src/css/compiler/index';
import { css, color } from '../../../src/css/index';

describe('compileStyle engine', () => {
  it('should compile flat styles with shorthand expansion', () => {
    const input = {
      padding: '16px',
      background: '#2563eb',
    };
    const { classes, rules } = compileStyle(input);

    expect(classes).toEqual(['pt_16px', 'pr_16px', 'pb_16px', 'pl_16px', 'bg_2563eb']);

    expect(rules).toHaveLength(5);
    expect(rules[0]).toEqual({
      className: 'pt_16px',
      selector: '.pt_16px',
      property: 'padding-top',
      value: '16px',
      declaration: '.pt_16px { padding-top: 16px; }',
    });
    expect(rules[4]).toEqual({
      className: 'bg_2563eb',
      selector: '.bg_2563eb',
      property: 'background',
      value: '#2563eb',
      declaration: '.bg_2563eb { background: #2563eb; }',
    });
  });

  it('should handle property overrides correctly via shorthand expansion', () => {
    const input = {
      padding: ['16px', '24px'],
      paddingLeft: '32px',
    };
    const { classes } = compileStyle(input);

    // Should contain paddingLeft: 32px (pl_32px) and not pl_24px
    expect(classes).toEqual(['pt_16px', 'pr_24px', 'pb_16px', 'pl_32px']);
  });

  it('should compile responsive values', () => {
    const input = {
      paddingLeft: {
        base: '16px',
        md: '24px',
        lg: '32px',
      },
    };
    const { classes, rules } = compileStyle(input);

    expect(classes).toEqual(['pl_16px', 'md:pl_24px', 'lg:pl_32px']);
    expect(rules).toHaveLength(3);

    expect(rules[0]).toEqual({
      className: 'pl_16px',
      selector: '.pl_16px',
      property: 'padding-left',
      value: '16px',
      declaration: '.pl_16px { padding-left: 16px; }',
    });

    expect(rules[1]).toEqual({
      className: 'md:pl_24px',
      selector: '.md\\:pl_24px',
      property: 'padding-left',
      value: '24px',
      declaration: '.md\\:pl_24px { padding-left: 24px; }',
      mediaQuery: 'min-width: 768px',
    });

    expect(rules[2]).toEqual({
      className: 'lg:pl_32px',
      selector: '.lg\\:pl_32px',
      property: 'padding-left',
      value: '32px',
      declaration: '.lg\\:pl_32px { padding-left: 32px; }',
      mediaQuery: 'min-width: 1024px',
    });
  });

  it('should compile pseudo-class blocks', () => {
    const input = {
      color: '#000',
      ':hover': {
        color: '#fff',
        background: '#2563eb',
      },
    };
    const { classes, rules } = compileStyle(input);

    expect(classes).toEqual(['text_000', 'hover:text_fff', 'hover:bg_2563eb']);
    expect(rules).toHaveLength(3);

    expect(rules[1]).toEqual({
      className: 'hover:text_fff',
      selector: '.hover\\:text_fff:hover',
      property: 'color',
      value: '#fff',
      declaration: '.hover\\:text_fff:hover { color: #fff; }',
    });
  });

  it('should compile nested responsive and pseudo-class blocks', () => {
    const input = {
      paddingLeft: {
        base: '16px',
        md: '24px',
      },
      ':hover': {
        background: {
          base: '#fff',
          md: '#2563eb',
        },
      },
    };
    const { classes, rules } = compileStyle(input);

    // hover modifier + base background value -> hover:bg_fff
    // hover modifier + md background value -> md:hover:bg_2563eb
    expect(classes).toContain('hover:bg_fff');
    expect(classes).toContain('md:hover:bg_2563eb');

    const mdHoverRule = rules.find((r) => r.className === 'md:hover:bg_2563eb');
    expect(mdHoverRule).toBeDefined();
    expect(mdHoverRule).toEqual({
      className: 'md:hover:bg_2563eb',
      selector: '.md\\:hover\\:bg_2563eb:hover',
      property: 'background',
      value: '#2563eb',
      declaration: '.md\\:hover\\:bg_2563eb:hover { background: #2563eb; }',
      mediaQuery: 'min-width: 768px',
    });
  });

  it('should compile complex border values ignoring parentheses spaces', () => {
    const input = {
      border: '1px solid rgb(255, 0, 0)',
    };
    const { classes } = compileStyle(input);
    expect(classes).toEqual(['border-w_1px', 'border-s_solid', 'border-c_rgb_255_0_0']);
  });

  it('should compile outline shorthands', () => {
    const input = {
      outline: '2px dashed #00f',
    };
    const { classes } = compileStyle(input);
    expect(classes).toEqual(['outline-w_2px', 'outline-s_dashed', 'outline-c_00f']);
  });

  it('should compile unregistered and custom pseudo-classes', () => {
    const input = {
      ':checked': {
        color: '#00f',
      },
      ':nth-child(2)': {
        color: '#f00',
      },
    };
    const { classes, rules } = compileStyle(input);
    expect(classes).toEqual(['checked:text_00f', 'nth-child_2:text_f00']);

    const checkedRule = rules.find((r) => r.className === 'checked:text_00f');
    expect(checkedRule?.selector).toBe('.checked\\:text_00f:checked');

    const nthChildRule = rules.find((r) => r.className === 'nth-child_2:text_f00');
    expect(nthChildRule?.selector).toBe('.nth-child_2\\:text_f00:nth-child(2)');
  });

  it('should compile pseudo-elements with double colons', () => {
    const input = {
      '::before': {
        color: 'red',
      },
    };
    const { classes, rules } = compileStyle(input);
    expect(classes).toEqual(['before:text_red']);

    const beforeRule = rules.find((r) => r.className === 'before:text_red');
    expect(beforeRule?.selector).toBe('.before\\:text_red::before');
    expect(beforeRule?.declaration).toBe('.before\\:text_red::before { color: red; }');
  });

  it('should throw an error when encountering nested responsive objects', () => {
    const input = {
      paddingLeft: {
        base: '16px',
        md: {
          base: '24px',
        } as any,
      },
    };
    expect(() => compileStyle(input)).toThrowError(
      /Invalid nested object detected under responsive key "md"/
    );
  });

  it('should expand and compile flex and grid layout descriptors', () => {
    const input = {
      display: css.flex({
        direction: 'row',
        align: 'center',
        gap: css.px(16)
      })
    };
    const { classes } = compileStyle(input);
    expect(classes.sort()).toEqual(['d_flex', 'flex-dir_row', 'items_center', 'gap_16px'].sort());
  });

  it('should compile children and pseudo selectors using & replacement rules', () => {
    const input = {
      display: 'block',
      [css.children('li')]: {
        padding: css.px(8)
      },
      [css.pseudo('first-child')]: {
        borderTop: 'none'
      }
    };
    const { classes, rules } = compileStyle(input);

    expect(classes).toContain('li:pt_8px');
    expect(classes).toContain('first-child:border-top_none');

    const childRule = rules.find(r => r.className === 'li:pt_8px');
    expect(childRule?.selector).toBe('.li\\:pt_8px > li');
    expect(childRule?.declaration).toBe('.li\\:pt_8px > li { padding-top: 8px; }');

    const pseudoRule = rules.find(r => r.className === 'first-child:border-top_none');
    expect(pseudoRule?.selector).toBe('.first-child\\:border-top_none:first-child');
    expect(pseudoRule?.declaration).toBe('.first-child\\:border-top_none:first-child { border-top: none; }');
  });

  it('should compile advanced chainable selectors', () => {
    const input = {
      [css.child('li').first]: {
        color: 'red'
      },
      [css.descendant('span').hover]: {
        color: 'blue'
      },
      [css.sibling('div').pseudo('focus')]: {
        color: 'green'
      }
    };
    const { classes, rules } = compileStyle(input);

    expect(classes).toContain('li:first-child:text_red');
    expect(classes).toContain('span:hover:text_blue');
    expect(classes).toContain('div:focus:text_green');

    const rule1 = rules.find(r => r.className === 'li:first-child:text_red');
    expect(rule1?.selector).toBe('.li\\:first-child\\:text_red > li:first-child');
    expect(rule1?.declaration).toBe('.li\\:first-child\\:text_red > li:first-child { color: red; }');

    const rule2 = rules.find(r => r.className === 'span:hover:text_blue');
    expect(rule2?.selector).toBe('.span\\:hover\\:text_blue span:hover');
    expect(rule2?.declaration).toBe('.span\\:hover\\:text_blue span:hover { color: blue; }');

    const rule3 = rules.find(r => r.className === 'div:focus:text_green');
    expect(rule3?.selector).toBe('.div\\:focus\\:text_green + div:focus');
  });

  it('should compile responsive media range query blocks', () => {
    const input = {
      [css.above('md')]: {
        display: 'block'
      },
      [css.below('lg')]: {
        display: 'none'
      },
      [css.matchBreakpoint('sm')]: {
        display: 'flex'
      },
      [css.between('md', 'xl')]: {
        display: 'grid'
      }
    };
    const { classes, rules } = compileStyle(input);

    const rule1 = rules.find(r => r.mediaQuery === '(min-width: 768px)');
    expect(rule1).toBeDefined();
    expect(rule1?.property).toBe('display');
    expect(rule1?.value).toBe('block');

    const rule2 = rules.find(r => r.mediaQuery === '(max-width: 1023.98px)');
    expect(rule2).toBeDefined();
    expect(rule2?.property).toBe('display');
    expect(rule2?.value).toBe('none');

    const rule3 = rules.find(r => r.mediaQuery === '(min-width: 640px) and (max-width: 767.98px)');
    expect(rule3).toBeDefined();
    expect(rule3?.property).toBe('display');
    expect(rule3?.value).toBe('flex');

    const rule4 = rules.find(r => r.mediaQuery === '(min-width: 768px) and (max-width: 1279.98px)');
    expect(rule4).toBeDefined();
    expect(rule4?.property).toBe('display');
    expect(rule4?.value).toBe('grid');
  });

  it('should compile @import global statements', () => {
    const input = {
      '@import': 'url("https://fonts.googleapis.com/css2?family=Inter")',
      display: 'block'
    };
    const { classes, rules } = compileStyle(input);

    expect(classes).toContain('d_block');
    expect(classes).not.toContain('');

    const importRule = rules.find(r => r.property === '@import');
    expect(importRule).toBeDefined();
    expect(importRule?.declaration).toBe('@import url("https://fonts.googleapis.com/css2?family=Inter");');
    expect(importRule?.className).toBe('');
    expect(importRule?.selector).toBe('');
  });

  it('should compile DX shorthands and sequential modifiers correctly', () => {
    const input = {
      d: 'flex',
      jc: 'center',
      ai: 'center',
      bg: '#3b82f6',
      hover: '#2563eb',
      mdHover: '#1d4ed8',
    };
    const { classes, rules } = compileStyle(input);

    expect(classes.sort()).toEqual([
      'd_flex',
      'justify_center',
      'items_center',
      'bg_3b82f6',
      'hover:bg_2563eb',
      'media-min-width_-768px:hover:bg_1d4ed8'
    ].sort());

    const hoverRule = rules.find((r) => r.className === 'hover:bg_2563eb');
    expect(hoverRule).toBeDefined();
    expect(hoverRule?.selector).toBe('.hover\\:bg_2563eb:hover');
    expect(hoverRule?.property).toBe('background');
    expect(hoverRule?.value).toBe('#2563eb');
    expect(hoverRule?.mediaQuery).toBeUndefined();

    const mdHoverRule = rules.find((r) => r.className === 'media-min-width_-768px:hover:bg_1d4ed8');
    expect(mdHoverRule).toBeDefined();
    expect(mdHoverRule?.selector).toBe('.media-min-width_-768px\\:hover\\:bg_1d4ed8:hover');
    expect(mdHoverRule?.property).toBe('background');
    expect(mdHoverRule?.value).toBe('#1d4ed8');
    expect(mdHoverRule?.mediaQuery).toBe('(min-width: 768px)');
  });

  it('should compile border.none into atomic width/style classes', () => {
    const input = { border: css.border.none() };
    const { classes } = compileStyle(input);

    expect(classes.sort()).toEqual(['border-s_none', 'border-w_0'].sort());
  });

  it('should compile border({ style: "none" }) into atomic width/style classes', () => {
    const input = { border: css.border({ style: 'none', width: 0 }) };
    const { classes } = compileStyle(input);

    expect(classes.sort()).toEqual(['border-s_none', 'border-w_0'].sort());
  });

  it('should compile outline with numeric width to px', () => {
    const input = { ...css.outline({ width: 2, color: color('#2563eb'), offset: 1 }) };
    const { classes, rules } = compileStyle(input);

    expect(classes).toContain('outline-w_2px');
    expect(classes).toContain('outline-s_solid');
    expect(classes).toContain('outline-c_2563eb');
    expect(classes).toContain('outline-off_1px');

    expect(rules.find((r) => r.property === 'outline-width')).toMatchObject({ value: '2px' });
    expect(rules.find((r) => r.property === 'outline-style')).toMatchObject({ value: 'solid' });
    expect(rules.find((r) => r.property === 'outline-color')).toMatchObject({ value: '#2563eb' });
    expect(rules.find((r) => r.property === 'outline-offset')).toMatchObject({ value: '1px' });
  });
});

