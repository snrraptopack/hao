import { describe, it, expect } from 'vitest';
import { compileStyle } from '../../../src/css/compiler/index';
import { css } from '../../../src/css/index';

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
});
