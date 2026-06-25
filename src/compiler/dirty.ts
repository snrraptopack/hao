import type { DerivedContext } from './derived';
import type { DynamicPatch } from './types';
import { expressionDependencies } from './utils';

const GLOBAL_IDENTIFIERS = new Set([
  'true', 'false', 'null', 'undefined', 'NaN', 'Infinity',
  'console', 'window', 'document', 'Math', 'JSON', 'Date', 'String', 'Number',
  'Array', 'Object', 'RegExp', 'Error', 'Promise', 'Set', 'Map',
  'parseInt', 'parseFloat', 'isNaN', 'isFinite',
]);

function singleQuoted(value: string): string {
  return `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

function stripStrings(code: string): string {
  return code.replace(/(['"`])(?:\\.|(?!\1).)*\1/g, '');
}

function externalSourceDeps(expression: string, derivedCtx: DerivedContext | null): string[] {
  const deps = new Set<string>();
  const code = stripStrings(expression);
  const propertyPattern = /\b([A-Za-z_$][\w$]*)\.([A-Za-z_$][\w$]*)\b/g;
  let match: RegExpExecArray | null;

  while ((match = propertyPattern.exec(code)) !== null) {
    const root = match[1]!;
    const prop = match[2]!;
    if (GLOBAL_IDENTIFIERS.has(root)) continue;
    if (derivedCtx?.locals.has(root)) continue;
    deps.add(`${root}.${prop}`);
  }

  return Array.from(deps);
}

function patchDeps(patch: DynamicPatch, derivedCtx: DerivedContext | null): string[] {
  const deps = new Set<string>();

  for (const dep of patch.deps) {
    const sourceDeps = derivedCtx?.sourceDeps(dep) ?? expressionDependencies(dep, '');
    for (const source of sourceDeps) deps.add(source);
    for (const source of externalSourceDeps(dep, derivedCtx)) deps.add(source);
  }

  return Array.from(deps);
}

export function usesDirtyTracking(setup: readonly string[], patches: readonly DynamicPatch[]): boolean {
  return setup.some((line) => line.includes('__dirty.add('))
    || patches.some((patch) => patch.code.includes('__dirty.add('));
}

export function dirtySetupLine(setup: readonly string[], patches: readonly DynamicPatch[]): string[] {
  return usesDirtyTracking(setup, patches) ? ['const __dirty = new Set<string>();'] : [];
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
