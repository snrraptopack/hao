/**
 * @fileoverview Shared types and constants for the Auwla compiler.
 */

import ts from 'typescript';
import type { DerivedContext } from './derived';

export type DynamicPatch = {
  code: string;
  deps: string[];
};

export type CompileContext = {
  source: ts.SourceFile;
  elementId: number;
  mapId: number;
  textId: number;
  patches: DynamicPatch[];
  deps: string[];
  setup: string[];
  derivedCtx?: DerivedContext | null;
};

export type CompileResult = {
  code: string;
  root: string;
};

export type TemplatePatch = DynamicPatch & {
  initOnly?: boolean;
};

export type TemplateContext = {
  source: ts.SourceFile;
  itemName: string;
  keyText: string;
  elementId: number;
  textId: number;
  elementSetup: string[];
  textSetup: string[];
  patches: TemplatePatch[];
  deps: string[];
  elementVars: Map<string, string>;
  derivedCtx?: DerivedContext | null;
};

export const COMPILER_IMPORT = [
  '__componentBlock',
  '__cloneTemplate',
  '__createBlock',
  '__dirtySource',
  '__event',
  '__keyedMap',
  '__setAttribute',
  '__setChild',
  '__setClass',
  '__setElementText',
  '__setProperty',
  '__setStyle',
  '__setText',
  '__spreadProps',
  '__trackSources',
].join(', ');

export const PROPERTY_PROPS = new Set([
  'checked',
  'disabled',
  'hidden',
  'multiple',
  'selected',
  'value',
]);

export const SVG_TAGS = new Set([
  'svg', 'g', 'path', 'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon',
  'text', 'tspan', 'defs', 'use', 'clipPath', 'mask', 'pattern', 'linearGradient',
  'radialGradient', 'stop', 'image', 'foreignObject',
]);

export function isSvgTag(tag: string): boolean {
  return SVG_TAGS.has(tag);
}
