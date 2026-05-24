import { __wrapCompilerEvent, toNode, type RenderClosure } from './memo-dom';

export type CompiledBlock<TArgs extends readonly unknown[] = readonly unknown[]> = {
  readonly node: Node;
  update(...args: TArgs): void;
  destroy?(): void;
};

const NO_INDEX = -1;

type Row<TItem> = {
  key: unknown;
  block: CompiledBlock<[TItem, number]>;
  deps: unknown;
};
type StyledElement = HTMLElement & {
  __auwlaStyle?: Record<string, string | number | null | undefined>;
};
type ChildMarker = Node & {
  __auwlaChildNodes?: Node[];
};

const UNITLESS_STYLES = new Set([
  'animationIterationCount',
  'aspectRatio',
  'borderImageOutset',
  'borderImageSlice',
  'borderImageWidth',
  'boxFlex',
  'boxFlexGroup',
  'boxOrdinalGroup',
  'columnCount',
  'columns',
  'flex',
  'flexGrow',
  'flexPositive',
  'flexShrink',
  'flexNegative',
  'flexOrder',
  'gridArea',
  'gridRow',
  'gridRowEnd',
  'gridRowSpan',
  'gridRowStart',
  'gridColumn',
  'gridColumnEnd',
  'gridColumnSpan',
  'gridColumnStart',
  'fontWeight',
  'lineClamp',
  'lineHeight',
  'opacity',
  'order',
  'orphans',
  'tabSize',
  'widows',
  'zIndex',
  'zoom',
]);

function removeNode(node: Node) {
  if (node.parentNode) node.parentNode.removeChild(node);
}

function sameArrayDeps(a: readonly unknown[], b: readonly unknown[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (!Object.is(a[i], b[i])) return false;
  }
  return true;
}

function sameDeps(a: unknown, b: unknown): boolean {
  if (Array.isArray(a) && Array.isArray(b)) return sameArrayDeps(a, b);
  return Object.is(a, b);
}

function compiledValue(value: unknown): string {
  return value == null || typeof value === 'boolean' ? '' : String(value);
}

function compiledStyleValue(name: string, value: string | number | null | undefined): string {
  if (value == null) return '';
  if (typeof value === 'number' && value !== 0 && !UNITLESS_STYLES.has(name)) return `${value}px`;
  return String(value);
}

function setCompiledProp(element: HTMLElement, name: string, value: unknown) {
  if (value === false || value === null || value === undefined) {
    if (name in element) {
      try {
        (element as any)[name] = typeof (element as any)[name] === 'boolean' ? false : '';
      } catch {
        // Ignore readonly DOM properties.
      }
    }
    element.removeAttribute(name);
    return;
  }

  if (value === true) {
    element.setAttribute(name, '');
    if (name in element) {
      try {
        (element as any)[name] = true;
      } catch {
        // Ignore readonly DOM properties.
      }
    }
    return;
  }

  if (name in element) {
    try {
      (element as any)[name] = value;
      return;
    } catch {
      // Fall through to attribute assignment for readonly DOM properties.
    }
  }

  element.setAttribute(name, String(value));
}

function longestIncreasingSubsequence(values: number[]): number[] {
  const predecessors = new Array<number>(values.length);
  const result: number[] = [];

  for (let i = 0; i < values.length; i++) {
    const value = values[i]!;
    if (value === NO_INDEX) continue;

    let low = 0;
    let high = result.length;
    while (low < high) {
      const mid = (low + high) >> 1;
      if (values[result[mid]!]! < value) low = mid + 1;
      else high = mid;
    }

    if (low > 0) predecessors[i] = result[low - 1]!;
    result[low] = i;
  }

  let cursor = result.length ? result[result.length - 1]! : NO_INDEX;
  for (let i = result.length - 1; i >= 0; i--) {
    result[i] = cursor;
    cursor = predecessors[cursor] ?? NO_INDEX;
  }

  return result;
}

function placeCompiledNodes(parent: Node, nodes: Node[], anchor: Node, oldChildren: Node[]) {
  const oldIndexes = new Map<Node, number>();
  for (let i = 0; i < oldChildren.length; i++) oldIndexes.set(oldChildren[i]!, i);

  const indexes = nodes.map((node) => oldIndexes.get(node) ?? NO_INDEX);
  const stableIndexes = longestIncreasingSubsequence(indexes);
  let stableCursor = stableIndexes.length - 1;

  for (let i = nodes.length - 1; i >= 0; i--) {
    const node = nodes[i]!;
    const next = nodes[i + 1] ?? anchor;
    const isStable = stableCursor >= 0 && stableIndexes[stableCursor] === i;

    if (isStable && node.parentNode === parent && node.nextSibling === next) {
      stableCursor--;
      continue;
    }

    if (node.parentNode !== parent || node.nextSibling !== next) {
      parent.insertBefore(node, next);
    }
  }
}

function swapCompiledRows<TItem>(
  parent: Node,
  orderedRows: Row<TItem>[],
  leftIndex: number,
  rightIndex: number,
  anchor: Node,
) {
  const left = orderedRows[leftIndex]!;
  const right = orderedRows[rightIndex]!;
  const afterRight = orderedRows[rightIndex + 1]?.block.node ?? anchor;

  parent.insertBefore(right.block.node, left.block.node);
  parent.insertBefore(left.block.node, afterRight);

  orderedRows[leftIndex] = right;
  orderedRows[rightIndex] = left;
}

export function __createBlock<TArgs extends readonly unknown[]>(
  factory: () => CompiledBlock<TArgs>,
): CompiledBlock<TArgs> {
  return factory();
}

export function __componentBlock(factory: () => CompiledBlock<[]>): RenderClosure {
  let block: CompiledBlock<[]> | null = null;

  return () => {
    block ??= factory();
    block.update();
    return block.node;
  };
}

export function __event(handler: (event: Event) => unknown): EventListener {
  return __wrapCompilerEvent(handler);
}

export function __setText(node: CharacterData, value: unknown): void {
  const next = compiledValue(value);
  if (node.data !== next) node.data = next;
}

export function __setChild(parent: Node, current: Node, value: unknown): Node {
  const marker = current as ChildMarker;
  const previous = marker.__auwlaChildNodes;

  if (previous) {
    for (const node of previous) removeNode(node);
  }

  if (value === null || value === undefined || value === false || value === true) {
    marker.__auwlaChildNodes = [];
    return marker;
  }

  const next = toNode(value);
  const nodes = next instanceof DocumentFragment ? Array.from(next.childNodes) : [next];
  parent.insertBefore(next, marker);
  marker.__auwlaChildNodes = nodes;
  return marker;
}

export function __setClass(element: HTMLElement, value: unknown): void {
  const next = compiledValue(value);
  if (element.className !== next) element.className = next;
}

export function __setProperty(element: HTMLElement, name: string, value: unknown): void {
  setCompiledProp(element, name, value);
}

export function __setAttribute(element: HTMLElement, name: string, value: unknown): void {
  if (value === false || value === null || value === undefined) {
    element.removeAttribute(name);
    return;
  }

  const next = value === true ? '' : String(value);
  if (element.getAttribute(name) !== next) element.setAttribute(name, next);
}

export function __setStyle(
  element: HTMLElement,
  styles: Record<string, string | number | null | undefined>,
): void;
export function __setStyle(
  element: HTMLElement,
  name: keyof CSSStyleDeclaration | string,
  value: string | number | null | undefined,
): void;
export function __setStyle(
  element: HTMLElement,
  nameOrStyles: keyof CSSStyleDeclaration | string | Record<string, string | number | null | undefined>,
  value?: string | number | null | undefined,
): void {
  if (typeof nameOrStyles === 'object' && nameOrStyles !== null) {
    const target = element as StyledElement;
    const oldStyle = target.__auwlaStyle ?? {};
    const nextStyle = nameOrStyles;
    target.__auwlaStyle = nextStyle;

    for (const name of Object.keys(oldStyle)) {
      if (name in nextStyle) continue;
      try {
        (element.style as any)[name] = '';
      } catch {
        // Ignore invalid/readonly style properties.
      }
    }

    for (const name of Object.keys(nextStyle)) {
      const next = compiledStyleValue(name, nextStyle[name]);
      if (Object.is(compiledStyleValue(name, oldStyle[name]), next)) continue;
      try {
        (element.style as any)[name] = next;
      } catch {
        // Ignore invalid/readonly style properties.
      }
    }
    return;
  }

  const name = String(nameOrStyles);
  const next = compiledStyleValue(name, value);
  if ((element.style as any)[name] !== next) {
    try {
      (element.style as any)[name] = next;
    } catch {
      // Ignore invalid/readonly style properties.
    }
  }
}

export function __keyedMap<TItem, TKey>(
  items: readonly TItem[],
  keyOf: (item: TItem, index: number) => TKey,
  createRow: (item: TItem, index: number) => CompiledBlock<[TItem, number]>,
  updateRow: (block: CompiledBlock<[TItem, number]>, item: TItem, index: number) => void,
  depsOf?: (item: TItem, index: number) => unknown,
): CompiledBlock<[readonly TItem[]]> {
  const fragment = document.createDocumentFragment();
  const anchor = document.createComment('auwla:keyed-map');
  const rows = new Map<TKey, Row<TItem>>();
  const orderedRows: Row<TItem>[] = [];

  const block: CompiledBlock<[readonly TItem[]]> = {
    node: fragment,
    update(nextItems) {
      const parent = anchor.parentNode ?? fragment;
      let mismatchA = -1;
      let mismatchB = -1;
      let needsPlacement = false;

      if (orderedRows.length === nextItems.length) {
        for (let index = 0; index < nextItems.length; index++) {
          const item = nextItems[index]!;
          const key = keyOf(item, index);
          const row = orderedRows[index]!;

          if (Object.is(row.key, key)) {
            const deps = depsOf ? depsOf(item, index) : null;
            if (!depsOf || !sameDeps(row.deps, deps)) {
              updateRow(row.block, item, index);
              row.deps = deps;
            }
          if (row.block.node.parentNode !== parent) needsPlacement = true;
            continue;
          }

          if (mismatchA === -1) mismatchA = index;
          else if (mismatchB === -1) mismatchB = index;
          else {
            mismatchB = -2;
            break;
          }
        }

        if (mismatchA === -1) {
          if (needsPlacement) {
            const nodes = orderedRows.map((row) => row.block.node);
            placeCompiledNodes(parent, nodes, anchor, nodes);
          }
          return;
        }

        if (
          mismatchB >= 0
          && Object.is(orderedRows[mismatchA]!.key, keyOf(nextItems[mismatchB]!, mismatchB))
          && Object.is(orderedRows[mismatchB]!.key, keyOf(nextItems[mismatchA]!, mismatchA))
        ) {
          const leftItem = nextItems[mismatchA]!;
          const rightItem = nextItems[mismatchB]!;
          const leftRow = orderedRows[mismatchA]!;
          const rightRow = orderedRows[mismatchB]!;
          const leftDeps = depsOf ? depsOf(leftItem, mismatchA) : null;
          const rightDeps = depsOf ? depsOf(rightItem, mismatchB) : null;

          if (!depsOf || !sameDeps(rightRow.deps, leftDeps)) {
            updateRow(rightRow.block, leftItem, mismatchA);
            rightRow.deps = leftDeps;
          }

          if (!depsOf || !sameDeps(leftRow.deps, rightDeps)) {
            updateRow(leftRow.block, rightItem, mismatchB);
            leftRow.deps = rightDeps;
          }

          swapCompiledRows(parent, orderedRows, mismatchA, mismatchB, anchor);
          return;
        }
      }

      const nextRows = new Map<TKey, Row<TItem>>();
      const orderedNodes: Node[] = [];
      const oldNodes = orderedRows.map((row) => row.block.node);
      let orderChanged = oldNodes.length !== nextItems.length;
      orderedRows.length = 0;

      for (let index = 0; index < nextItems.length; index++) {
        const item = nextItems[index]!;
        const key = keyOf(item, index);
        const deps = depsOf ? depsOf(item, index) : null;
        let row = rows.get(key);

        if (!row) {
          row = { key, block: createRow(item, index), deps: null };
          updateRow(row.block, item, index);
        } else if (!depsOf || !sameDeps(row.deps, deps)) {
          updateRow(row.block, item, index);
        }

        row.deps = deps;
        nextRows.set(key, row);
        orderedRows.push(row);
        orderedNodes.push(row.block.node);
        if (!orderChanged && oldNodes[index] !== row.block.node) orderChanged = true;
        if (!orderChanged && row.block.node.parentNode !== parent) orderChanged = true;
      }

      for (const [key, row] of rows) {
        if (nextRows.has(key)) continue;
        row.block.destroy?.();
        removeNode(row.block.node);
      }

      rows.clear();
      for (const [key, row] of nextRows) rows.set(key, row);

      if (orderChanged) {
        placeCompiledNodes(parent, orderedNodes, anchor, oldNodes);
      }
    },
    destroy() {
      for (const row of rows.values()) {
        row.block.destroy?.();
        removeNode(row.block.node);
      }
      rows.clear();
      orderedRows.length = 0;
      removeNode(anchor);
    },
  };

  fragment.appendChild(anchor);
  block.update(items);
  return block;
}
