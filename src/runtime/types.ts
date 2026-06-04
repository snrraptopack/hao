/**
 * @fileoverview Core type definitions for the Auwla runtime.
 *
 * This module contains every type, interface, and type-guard used by
 * the component system, DOM patching, and app lifecycle.
 */

export type RenderClosure = () => MemoChild;

export type MemoChild =
  | Node
  | string
  | number
  | boolean
  | null
  | undefined
  | RenderClosure
  | TemplateNode
  | readonly unknown[];

export type EventHandler = (event: Event) => unknown;

export type MemoProps = Record<string, unknown> | null | undefined;

export type EventWrapper = (handler: EventHandler, ownerId?: string | null) => EventListener;

export type ComponentType = (props: Record<string, unknown>) => MemoChild | RenderClosure;

/** An HTMLElement augmented with Auwla's internal bookkeeping fields. */
export type MemoElement = HTMLElement & {
  __memoKey?: unknown;
  __memoProps?: Record<string, unknown>;
  __memoListeners?: Map<string, EventListener>;
  __memoTemplate?: TemplateNode;
};

/** Lightweight descriptor created during a render pass for an intrinsic element. */
export type TemplateNode = {
  __auwlaTemplate: true;
  __auwlaDirty?: boolean;
  ownerId: string | null;
  tag: keyof HTMLElementTagNameMap;
  props: Record<string, unknown>;
  children: MemoChild[];
  key: unknown;
};

/** Internal record of a mounted component instance. */
export type ComponentInstance = {
  type: ComponentType;
  key: unknown;
  props: Record<string, unknown>;
  render: RenderClosure;
  value?: MemoChild;
  cleanups?: (() => void)[];
};

/** Mutable state kept while an app is actively rendering. */
export type RenderState = {
  instances: Map<string, ComponentInstance>;
  memos: Map<string, MemoBlock>;
  seen: Set<string>;
  rendered: Set<string>;
  stack: string[];
  /**
   * Tracks how many times each `parent/ComponentName` pair has been
   * encountered at the current render depth.
   *
   * Key format: `"<parentId>/<componentLabel>"`
   *
   * Previously this was a `number[]` indexed by stack depth, which caused
   * counter-slot collision when a component was conditionally skipped: every
   * sibling after the skipped slot shifted by one, making the runtime think
   * they were new components (triggering setup re-runs and stale cleanups).
   *
   * Using a Map keyed by `(parent, name)` isolates each component type's
   * counter so skipping one does not affect its siblings.
   */
  counters: Map<string, number>;
  dirty: Set<string> | null;
  invalidate: (ownerId?: string | null) => void;
};

/** Cached result of a `memo()` call. */
export type MemoBlock = {
  deps: readonly unknown[];
  value: MemoChild;
};

/**
 * Opaque handle to a component instance, captured during setup.
 * Pass to `commit()` to re-render only that component's subtree.
 */
export type ComponentHandle = {
  /** @internal */
  readonly _id: string;
  /** @internal */
  readonly _invalidate: (ownerId?: string | null) => void;
};

export type MemoDeps = readonly unknown[];

export interface MemoContext<TModel> {
  readonly model: TModel;
  el<K extends keyof HTMLElementTagNameMap>(
    tag: K,
    props?: MemoProps,
    ...children: MemoChild[]
  ): HTMLElementTagNameMap[K];
  invalidate(): void;
  event(handler: (event: Event, model: TModel) => unknown): EventListener;
  memo(key: string | number, deps: MemoDeps, render: () => MemoChild): Node;
}

export interface MemoApp<TModel> {
  readonly model?: TModel;
  readonly root: Element;
  render(): void;
  destroy(): void;
}

/** @internal */
export type MountedApp = {
  // ownerId is optional — omitting it triggers a full-app invalidation,
  // passing a component ID limits the dirty set to that subtree.
  invalidate(ownerId?: string | null): void;
};

/** @internal */
export type MemoEntry = {
  deps: MemoDeps;
  node: Node;
};

/** Type guard: value is a render closure (function). */
export function isRenderClosure(value: unknown): value is RenderClosure {
  return typeof value === 'function';
}

/** Type guard: value is a lightweight template descriptor. */
export function isTemplateNode(value: unknown): value is TemplateNode {
  return !!value && typeof value === 'object' && (value as TemplateNode).__auwlaTemplate === true;
}

/** A standard DOM Node augmented with an optional Auwla owner component instance ID. */
export type AuwlaNode = Node & {
  __auwlaOwnerId?: string | null;
};
