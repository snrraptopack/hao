import { describe, it, expect } from 'vitest';
import { expandShorthands } from '../../../src/css/compiler/shorthands';

describe('expandShorthands', () => {
  it('should ignore properties that are not shorthands', () => {
    const input = { display: 'block', color: 'red' };
    const output = expandShorthands(input);
    expect(output).toEqual(input);
  });

  describe('padding, margin, inset (box model) expansion', () => {
    it('should expand a single value to all four sides', () => {
      const input = { padding: '16px', margin: '8px' };
      const output = expandShorthands(input);
      expect(output).toEqual({
        paddingTop: '16px',
        paddingRight: '16px',
        paddingBottom: '16px',
        paddingLeft: '16px',
        marginTop: '8px',
        marginRight: '8px',
        marginBottom: '8px',
        marginLeft: '8px',
      });
    });

    it('should expand a two-value array to vertical and horizontal sides', () => {
      const input = { padding: ['10px', '20px'] };
      const output = expandShorthands(input);
      expect(output).toEqual({
        paddingTop: '10px',
        paddingBottom: '10px',
        paddingLeft: '20px',
        paddingRight: '20px',
      });
    });

    it('should expand a three-value array to top, horizontal, and bottom', () => {
      const input = { margin: ['10px', '20px', '30px'] };
      const output = expandShorthands(input);
      expect(output).toEqual({
        marginTop: '10px',
        marginLeft: '20px',
        marginRight: '20px',
        marginBottom: '30px',
      });
    });

    it('should expand a four-value array to top, right, bottom, and left', () => {
      const input = { inset: ['10px', '20px', '30px', '40px'] };
      const output = expandShorthands(input);
      expect(output).toEqual({
        top: '10px',
        right: '20px',
        bottom: '30px',
        left: '40px',
      });
    });
  });

  describe('borderRadius expansion', () => {
    it('should expand a single value to all four corners', () => {
      const input = { borderRadius: '8px' };
      const output = expandShorthands(input);
      expect(output).toEqual({
        borderTopLeftRadius: '8px',
        borderTopRightRadius: '8px',
        borderBottomRightRadius: '8px',
        borderBottomLeftRadius: '8px',
      });
    });

    it('should expand space-separated values', () => {
      const input = { borderRadius: '4px 8px' };
      const output = expandShorthands(input);
      expect(output).toEqual({
        borderTopLeftRadius: '4px',
        borderBottomRightRadius: '4px',
        borderTopRightRadius: '8px',
        borderBottomLeftRadius: '8px',
      });
    });
  });

  describe('border expansion', () => {
    it('should expand a shorthand string border', () => {
      const input = { border: '1px solid red' };
      const output = expandShorthands(input);
      expect(output).toEqual({
        borderWidth: '1px',
        borderStyle: 'solid',
        borderColor: 'red',
      });
    });

    it('should expand side-specific border shorthands', () => {
      const input = { borderTop: '2px dashed blue' };
      const output = expandShorthands(input);
      expect(output).toEqual({
        borderTopWidth: '2px',
        borderTopStyle: 'dashed',
        borderTopColor: 'blue',
      });
    });

    it('should expand custom border objects', () => {
      const input = {
        border: {
          width: '1px',
          style: 'solid',
          color: 'green',
        },
      };
      const output = expandShorthands(input);
      expect(output).toEqual({
        borderWidth: '1px',
        borderStyle: 'solid',
        borderColor: 'green',
      });
    });
  });
});
