import ts from 'typescript';
import type { DerivedContext } from './derived';
import { extractIdentifiers } from './derived';
import type { DynamicPatch } from './types';
import { GLOBAL_IDENTIFIERS } from './constants';
import { expressionDependencies } from './utils';

function singleQuoted(value: string): string {
  return `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

function externalSourceDeps(expression: string, derivedCtx: DerivedContext | null): string[] {
  const sourceFile = ts.createSourceFile('temp.ts', `(${expression})`, ts.ScriptTarget.Latest, true);
  const deps = new Set<string>();

  function walk(node: ts.Node) {
    if (ts.isPropertyAccessExpression(node)) {
      if (ts.isIdentifier(node.expression) && ts.isIdentifier(node.name)) {
        const root = node.expression.text;
        const prop = node.name.text;
        if (!GLOBAL_IDENTIFIERS.has(root) && !derivedCtx?.locals.has(root)) {
          deps.add(`${root}.${prop}`);
        }
      }
    }
    ts.forEachChild(node, walk);
  }

  walk(sourceFile);
  return Array.from(deps);
}

function patchDeps(patch: DynamicPatch, derivedCtx: DerivedContext | null): string[] {
  // Any patch that reads a computed getter must re-run on every render pass;
  // the compiler cannot statically narrow its dependencies.
  if (derivedCtx) {
    for (const id of extractIdentifiers(patch.code)) {
      if (derivedCtx.derived.has(id)) return [];
    }
  }

  const deps = new Set<string>();

  for (const dep of patch.deps) {
    const sourceDeps = derivedCtx?.sourceDeps(dep) ?? expressionDependencies(dep, '');
    for (const source of sourceDeps) deps.add(source);
    for (const source of externalSourceDeps(dep, derivedCtx)) deps.add(source);
  }

  return Array.from(deps);
}

export function usesDirtyTracking(
  setup: readonly string[],
  patches: readonly DynamicPatch[],
  derivedCtx?: DerivedContext | null,
): boolean {
  return setup.some((line) => /\b__dirty\b/.test(line))
    || patches.some((patch) => /\b__dirty\b/.test(patch.code))
    || !!derivedCtx?.hasEffects
    || !!(derivedCtx && (
        derivedCtx.derived.size > 0 ||
        derivedCtx.conditionalAssignments.size > 0 ||
        derivedCtx.loopReplacements.size > 0
       ));
}

export function dirtySetupLine(
  _setup: readonly string[],
  _patches: readonly DynamicPatch[],
  _derivedCtx?: DerivedContext | null,
): string[] {
  return [];
}

export function externalPatchDeps(patches: readonly DynamicPatch[], derivedCtx: DerivedContext | null): string[] {
  const deps = new Set<string>();
  for (const patch of patches) {
    for (const dep of patch.deps) {
      for (const source of externalSourceDeps(dep, derivedCtx)) deps.add(source);
    }
  }
  return Array.from(deps);
}

export function sourceTrackingLines(patches: readonly DynamicPatch[], derivedCtx: DerivedContext | null): string[] {
  const deps = externalPatchDeps(patches, derivedCtx);
  if (deps.length === 0) return [];
  return [`__trackSources([${deps.map((dep) => singleQuoted(dep)).join(', ')}]);`];
}

export function renderUpdateBody(
  patches: readonly DynamicPatch[],
  derivedCtx: DerivedContext | null,
  indent: string,
  dirtyAware: boolean,
  forceAll = false,
): string {
  if (patches.length === 0) return `${indent}// Static block; no dynamic fields to patch.`;

  if (!dirtyAware) {
    return patches.map((patch) => `${indent}${patch.code}`).join('\n');
  }

  const groups = new Map<string, DynamicPatch[]>();
  const alwaysPatches: DynamicPatch[] = [];
  const fullPatches: DynamicPatch[] = [];

  for (const patch of patches) {
    const deps = patchDeps(patch, derivedCtx);
    if (deps.length === 0) {
      // No trackable source dependencies (e.g. volatile derived values like
      // array method calls). Recompute on every render pass.
      alwaysPatches.push(patch);
    } else if (deps.length === 1) {
      const dep = deps[0]!;
      const bucket = groups.get(dep) ?? [];
      bucket.push(patch);
      groups.set(dep, bucket);
    } else {
      fullPatches.push(patch);
    }
  }

  const lines: string[] = [
    forceAll
      ? `${indent}const _all = true;`
      : `${indent}const _all = __dirty.size === 0 || __dirty.delete('__all');`,
  ];

  for (const [dep, bucket] of groups) {
    const flag = `_${dep.replace(/[^A-Za-z0-9_$]/g, '_')}`;
    lines.push(`${indent}const ${flag} = _all || __dirty.delete(${singleQuoted(dep)});`);
    lines.push(`${indent}if (${flag}) {`);
    for (const patch of bucket) {
      lines.push(`${indent}  ${patch.code}`);
    }
    lines.push(`${indent}}`);
  }

  if (fullPatches.length > 0) {
    lines.push(`${indent}if (_all) {`);
    for (const patch of fullPatches) {
      lines.push(`${indent}  ${patch.code}`);
    }
    lines.push(`${indent}}`);
  }

  if (alwaysPatches.length > 0) {
    for (const patch of alwaysPatches) {
      lines.push(`${indent}${patch.code}`);
    }
  }

  lines.push(`${indent}__dirty.clear();`);
  return lines.join('\n');
}
