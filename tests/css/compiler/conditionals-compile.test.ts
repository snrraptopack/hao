import { describe, it, expect } from 'vitest';
import { compileCSS } from '../../../src/css/compiler/css-compiler';

describe('compileCSS conditionals', () => {
  it('extracts nested css.when with single-value branches', () => {
    const code = `
/** @jsxImportSource auwla */
function Card(props: { active: boolean }) {
  return () => <div style={css({ background: css.when(props.active, { true: 'blue', false: 'red' }) })} />;
}
`;
    const result = compileCSS(code, 'Card.tsx');

    expect(result).toContain('bg_blue');
    expect(result).toContain('bg_red');
    expect(result).toContain('props.active ? "bg_blue" : "bg_red"');
  });

  it('extracts nested css.when with StyleObject branches', () => {
    const code = `
/** @jsxImportSource auwla */
function Card(props: { active: boolean }) {
  return () => (
    <div style={css({
      background: css.when(props.active, {
        true: { color: 'white', fontSize: '16px' },
        false: { color: 'black', fontSize: '14px' },
      })
    })} />
  );
}
`;
    const result = compileCSS(code, 'Card.tsx');

    expect(result).toContain('text_white');
    expect(result).toContain('text_black');
    expect(result).toContain('text_16px');
    expect(result).toContain('text_14px');
    expect(result).toContain('props.active ?');
  });

  it('extracts nested css.match with single-value branches', () => {
    const code = `
/** @jsxImportSource auwla */
function Card(props: { tag: 'bug' | 'feature' }) {
  return () => <div style={css({ background: css.match(props.tag, { bug: 'red', feature: 'blue' }) })} />;
}
`;
    const result = compileCSS(code, 'Card.tsx');

    expect(result).toContain('bg_red');
    expect(result).toContain('bg_blue');
    expect(result).toContain('"bug": "bg_red"');
    expect(result).toContain('"feature": "bg_blue"');
    expect(result).toContain('[props.tag]');
  });

  it('extracts nested css.match with StyleObject branches', () => {
    const code = `
/** @jsxImportSource auwla */
function Card(props: { tag: 'bug' | 'feature' }) {
  return () => (
    <div style={css({
      background: css.match(props.tag, {
        bug: { color: '#A32D2D', fontSize: '12px' },
        feature: { color: '#185FA5', fontSize: '12px' },
      })
    })} />
  );
}
`;
    const result = compileCSS(code, 'Card.tsx');

    expect(result).toContain('text_A32D2D');
    expect(result).toContain('text_185FA5');
    expect(result).toContain('text_12px');
    expect(result).toContain('"bug":');
    expect(result).toContain('"feature":');
    expect(result).toContain('[props.tag]');
  });

  it('supports spread of css.when result into css({...})', () => {
    const code = `
/** @jsxImportSource auwla */
function Card(props: { active: boolean }) {
  return () => (
    <div style={css({
      padding: '10px',
      ...css.when(props.active, {
        true: { color: 'green', borderWidth: '2px' },
        false: { color: 'gray', borderWidth: '1px' },
      })
    })} />
  );
}
`;
    const result = compileCSS(code, 'Card.tsx');

    // Static padding is extracted; the conditional spread is left for runtime.
    expect(result).toContain('pt_10px');
    expect(result).toContain('pb_10px');
    expect(result).toContain('...css.when(props.active');
  });

  it('extracts css.mergeWhen inside style as combined ternary classes', () => {
    const code = `
/** @jsxImportSource auwla */
function Card(props: { active: boolean; disabled: boolean }) {
  return () => <div style={css.mergeWhen([
    [props.active, { background: 'blue' }],
    [props.disabled, { opacity: 0.5 }],
  ])} />;
}
`;
    const result = compileCSS(code, 'Card.tsx');

    expect(result).toContain('bg_blue');
    expect(result).toContain('opacity_0_5');
    expect(result).toContain('props.active');
    expect(result).toContain('props.disabled');
  });

  it('extracts css.mergeWhen with StyleObject branches', () => {
    const code = `
/** @jsxImportSource auwla */
function Card(props: { active: boolean; disabled: boolean }) {
  return () => <div style={css.mergeWhen([
    [props.active, { color: 'blue', fontSize: '16px' }],
    [props.disabled, { opacity: 0.5, cursor: 'not-allowed' }],
  ])} />;
}
`;
    const result = compileCSS(code, 'Card.tsx');

    expect(result).toContain('text_blue');
    expect(result).toContain('text_16px');
    expect(result).toContain('opacity_0_5');
    expect(result).toContain('cursor_not-allowed');
    expect(result).toContain('props.active');
    expect(result).toContain('props.disabled');
  });
});
