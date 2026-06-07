/**
 * @file dx.ts
 * @description
 * Developer Experience (DX) mappings and sequential modifier parser.
 * Imports shorthand maps from shorthand-map.ts for easy revision.
 */

import { SHORTHAND_MAP } from './shorthand-map';
import { BREAKPOINTS } from './breakpoints';

export const MODIFIERS = new Set([
  'hover', 'focus', 'active', 'visited', 'disabled', 'checked',
  'focusWithin', 'focusVisible', 'target', 'empty',
  'first', 'last', 'odd', 'even',
  'sm', 'md', 'lg', 'xl', '2xl',
  'dark', 'light'
]);

function splitModifiers(key: string): string[] {
  return key
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .split('_')
    .map(p => p.toLowerCase())
    .filter(Boolean);
}

function isModifierKey(key: string): boolean {
  const parts = splitModifiers(key);
  if (parts.length === 0) return false;
  return parts.every(part => MODIFIERS.has(part));
}

function getModifierSelector(mod: string): string {
  if (BREAKPOINTS[mod]) {
    return `@media (min-width: ${BREAKPOINTS[mod]})`;
  }
  if (mod === 'dark') {
    return '@media (prefers-color-scheme: dark)';
  }
  if (mod === 'light') {
    return '@media (prefers-color-scheme: light)';
  }
  const kebab = mod.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
  return `:${kebab}`;
}

function applyNestedModifier(
  target: Record<string, any>,
  prop: string,
  modifiers: string[],
  value: any
) {
  let current = target;
  for (const mod of modifiers) {
    const selector = getModifierSelector(mod);
    if (!current[selector]) {
      current[selector] = {};
    }
    current = current[selector];
  }
  const standardProp = SHORTHAND_MAP[prop] || prop;
  current[standardProp] = value;
}

function isResponsiveObject(value: any): boolean {
  if (typeof value !== 'object' || value === null || Array.isArray(value) || '_tag' in value) {
    return false;
  }
  const keys = Object.keys(value);
  if (keys.length === 0) return false;
  if (keys.includes('base')) return true;
  return keys.every(key => MODIFIERS.has(key));
}

/**
 * Parses sequential modifiers and expands developer-experience shorthands
 * to standard CSS properties.
 */
export function normalizeStyleObject(style: Record<string, any>): Record<string, any> {
  const normalized: Record<string, any> = {};
  let lastPropertyKey: string | null = null;

  for (const [key, value] of Object.entries(style)) {
    if (value === undefined || value === null) continue;

    if (key.startsWith(':') || key.startsWith('&') || key.startsWith('@media ')) {
      normalized[key] = normalizeStyleObject(value);
      continue;
    }

    if (isModifierKey(key)) {
      if (lastPropertyKey) {
        const modifiers = splitModifiers(key);
        applyNestedModifier(normalized, lastPropertyKey, modifiers, value);
      } else {
        normalized[key] = value;
      }
      continue;
    }

    const standardKey = SHORTHAND_MAP[key] || key;
    if (typeof value === 'object' && value !== null && !('_tag' in value) && !Array.isArray(value)) {
      if (isResponsiveObject(value)) {
        normalized[standardKey] = value;
      } else {
        normalized[standardKey] = normalizeStyleObject(value);
      }
    } else {
      normalized[standardKey] = value;
    }

    lastPropertyKey = standardKey;
  }

  return normalized;
}
