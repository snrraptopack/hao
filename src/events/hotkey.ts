/**
 * @fileoverview Global keyboard shortcut (hotkey) parser, matcher, and filtering system.
 * 
 * Exposes the `hotkeyModifier` which compiles keyboard combos (e.g. "ctrl+s", "mod+k")
 * and sequences (e.g. "g i") into a standard Auwla event modifier.
 */

import type { EventModifier } from './types';
import { isKeyboardEvent } from './shared';
import { BLOCKED_EVENT } from '../runtime/index';

export interface KeyCombo {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
  mod?: boolean;
}

export type KeySequence = KeyCombo[];

/**
 * Normalizes key names to match standard Browser KeyboardEvent.key values.
 */
function normalizeKey(key: string): string {
  const k = key.toLowerCase();
  if (k === 'esc' || k === 'escape') return 'escape';
  if (k === 'space' || k === 'spacebar') return ' ';
  if (k === 'del' || k === 'delete') return 'delete';
  if (k === 'ins' || k === 'insert') return 'insert';
  if (k === 'plus') return '+';
  return k;
}

/**
 * Parses a shortcut string into a structured KeySequence.
 * 
 * Supports:
 * - Single keys: "escape", "enter", "a", "/"
 * - Combos with modifiers: "ctrl+s", "mod+alt+k" (using "+" or "-")
 * - Sequences: "g i", "ctrl+k d" (separated by whitespace)
 */
export function parseHotkey(shortcut: string): KeySequence {
  const parts = shortcut.trim().split(/\s+/);
  return parts.map((part) => {
    let keyPart = '';
    let modifiersPart = part;
    
    // Handle '+' or '-' as literal keys themselves (e.g. "ctrl++", "ctrl+-")
    if (part.endsWith('++')) {
      keyPart = '+';
      modifiersPart = part.slice(0, -2);
    } else if (part.endsWith('+-')) {
      keyPart = '-';
      modifiersPart = part.slice(0, -2);
    } else if (part.endsWith('+')) {
      keyPart = '+';
      modifiersPart = part.slice(0, -1);
    } else if (part.endsWith('-')) {
      keyPart = '-';
      modifiersPart = part.slice(0, -1);
    } else {
      const segments = part.split(/[+-]/);
      keyPart = segments.pop() || '';
      modifiersPart = segments.join('+');
    }

    const combo: KeyCombo = { key: keyPart };
    const modifiers = modifiersPart.toLowerCase().split(/[+-]/);
    for (const mod of modifiers) {
      if (!mod) continue;
      if (mod === 'ctrl' || mod === 'control') combo.ctrl = true;
      else if (mod === 'shift') combo.shift = true;
      else if (mod === 'alt' || mod === 'option') combo.alt = true;
      else if (mod === 'meta' || mod === 'cmd' || mod === 'command') combo.meta = true;
      else if (mod === 'mod') combo.mod = true;
    }
    return combo;
  });
}

const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/i.test(navigator.userAgent || navigator.platform || '');

/**
 * Matches a specific parsed KeyCombo against a browser KeyboardEvent.
 */
export function matchCombo(combo: KeyCombo, event: KeyboardEvent): boolean {
  const eventKey = normalizeKey(event.key);
  const targetKey = normalizeKey(combo.key);
  
  if (eventKey !== targetKey) return false;
  
  const actualCtrl = event.ctrlKey;
  const actualShift = event.shiftKey;
  const actualAlt = event.altKey;
  const actualMeta = event.metaKey;
  
  let expectCtrl = !!combo.ctrl;
  let expectMeta = !!combo.meta;
  const expectShift = !!combo.shift;
  const expectAlt = !!combo.alt;
  
  if (combo.mod) {
    if (isMac) {
      expectMeta = true;
    } else {
      expectCtrl = true;
    }
  }
  
  return (
    actualCtrl === expectCtrl &&
    actualShift === expectShift &&
    actualAlt === expectAlt &&
    actualMeta === expectMeta
  );
}

/**
 * Checks if the focused element is a text input, textarea, or contenteditable.
 */
function isEditable(element: Element | null): boolean {
  if (!element) return false;
  const tagName = element.tagName.toLowerCase();
  if (tagName === 'input') {
    const type = (element as HTMLInputElement).type?.toLowerCase();
    const nonTextInputTypes = ['button', 'checkbox', 'file', 'hidden', 'image', 'radio', 'reset', 'submit'];
    return !nonTextInputTypes.includes(type);
  }
  if (tagName === 'textarea' || tagName === 'select') return true;
  if ((element as HTMLElement).isContentEditable) return true;
  return false;
}

/**
 * Returns an EventModifier that filters events to only match when the specified
 * keyboard shortcut or sequence is typed.
 * 
 * @example
 * <div onKeyDown={event.hotkey('ctrl+s').prevent.handler(save)} />
 */
export function hotkeyModifier(shortcuts: string | readonly string[]): EventModifier {
  const list = (Array.isArray(shortcuts) ? shortcuts : [shortcuts]).map(parseHotkey);
  
  // Create an independent stateful matcher for each sequence/combo
  const matchers = list.map((seq) => {
    let index = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;
    return {
      match: (event: KeyboardEvent): boolean => {
        if (timer) {
          clearTimeout(timer);
          timer = null;
        }

        if (matchCombo(seq[index]!, event)) {
          index++;
          if (index === seq.length) {
            index = 0;
            return true;
          }
          // Start sequence window timer (1s)
          timer = setTimeout(() => {
            index = 0;
          }, 1000);
          return false;
        }

        index = 0;
        // Fallback: Check if this key starts the sequence again
        if (matchCombo(seq[0]!, event)) {
          index = 1;
          if (index === seq.length) {
            index = 0;
            return true;
          }
          timer = setTimeout(() => {
            index = 0;
          }, 1000);
        }
        return false;
      },
      clearTimer: () => {
        if (timer) {
          clearTimeout(timer);
          timer = null;
        }
        index = 0;
      },
    };
  });

  const modifier: import('./types').EventModifier = (handler) => (event) => {
    if (!isKeyboardEvent(event)) return BLOCKED_EVENT;

    // Ignore single key hotkeys inside text fields to allow normal typing
    if (typeof document !== 'undefined' && isEditable(document.activeElement)) {
      const hasModifier = event.ctrlKey || event.metaKey || event.altKey;
      if (!hasModifier) return BLOCKED_EVENT;
    }

    let matched = false;
    for (const matcher of matchers) {
      if (matcher.match(event)) {
        matched = true;
      }
    }

    if (matched) return handler(event);
    return BLOCKED_EVENT;
  };

  modifier.cleanup = () => {
    for (const matcher of matchers) {
      matcher.clearTimer();
    }
  };

  return modifier;
}
