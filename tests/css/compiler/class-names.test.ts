import { describe, it, expect } from 'vitest';
import {
  getPropertyKey,
  sanitizeValue,
  toClassName,
  valueToString,
} from '../../../src/css/compiler/class-names';

describe('class-names compiler utility', () => {
  describe('getPropertyKey', () => {
    it('should abbreviate common properties', () => {
      expect(getPropertyKey('paddingLeft')).toBe('pl');
      expect(getPropertyKey('background')).toBe('bg');
      expect(getPropertyKey('backgroundColor')).toBe('bg');
      expect(getPropertyKey('borderRadius')).toBe('rounded');
    });

    it('should convert unmapped camelCase properties to kebab-case', () => {
      expect(getPropertyKey('outlineOffset')).toBe('outline-off'); // outlineOffset is in map -> outline-off
      expect(getPropertyKey('zIndex')).toBe('z-index'); // Not in map -> kebab-case
      expect(getPropertyKey('gridRowStart')).toBe('grid-row-start');
    });
  });

  describe('valueToString', () => {
    it('should handle primitives', () => {
      expect(valueToString('16px')).toBe('16px');
      expect(valueToString(45)).toBe('45');
      expect(valueToString(null)).toBe('');
      expect(valueToString(undefined)).toBe('');
    });

    it('should handle custom objects with toString', () => {
      const mockLength = {
        toString: () => '1.5rem',
      };
      expect(valueToString(mockLength)).toBe('1.5rem');
    });
  });

  describe('sanitizeValue', () => {
    it('should strip color hashes', () => {
      expect(sanitizeValue('#2563eb')).toBe('2563eb');
    });

    it('should convert dots to underscores', () => {
      expect(sanitizeValue('1.5rem')).toBe('1_5rem');
    });

    it('should convert percentages to pct', () => {
      expect(sanitizeValue('100%')).toBe('100pct');
    });

    it('should convert spaces and special characters', () => {
      expect(sanitizeValue('1px solid red')).toBe('1px-solid-red');
      expect(sanitizeValue('calc(10px + 2rem)')).toBe('calc_10px-2rem');
      expect(sanitizeValue('rgb(255, 0, 0)')).toBe('rgb_255_0_0');
    });

    it('should collapse multiple spaces/underscores/dashes and trim ends', () => {
      expect(sanitizeValue('  1.5rem  ')).toBe('1_5rem');
      expect(sanitizeValue('__foo__bar__')).toBe('foo_bar');
      expect(sanitizeValue('--foo--bar--')).toBe('foo-bar');
    });
  });

  describe('toClassName', () => {
    it('should build a simple class name', () => {
      expect(toClassName('paddingLeft', '16px')).toBe('pl_16px');
      expect(toClassName('background', '#ffffff')).toBe('bg_ffffff');
    });

    it('should build class names with modifiers', () => {
      expect(toClassName('paddingLeft', '16px', 'md')).toBe('md:pl_16px');
      expect(toClassName('background', '#2563eb', 'hover')).toBe('hover:bg_2563eb');
      expect(toClassName('width', '100%', 'md:hover')).toBe('md:hover:w_100pct');
    });
  });
});
