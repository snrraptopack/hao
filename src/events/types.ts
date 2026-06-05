import type { ComponentHandle } from '../runtime/types';

export type RuntimeEventHandler<TEvent = any> = (event: TEvent) => unknown;

export type WrappedEventHandler<THandler extends RuntimeEventHandler> = (
  event: Parameters<THandler>[0],
) => void;

export type EventModifier = ((handler: RuntimeEventHandler) => RuntimeEventHandler) & { cleanup?: () => void };

/**
 * Gate for `event.if(...)`.
 *
 * Use predicates for mutable closure state so the condition is evaluated at
 * event time. Plain booleans are snapshots and are only appropriate for values
 * that are intentionally fixed when the chain is created.
 */
export type EventCondition<TEvent = Event> = boolean | ((event: TEvent) => boolean);

export type EventTargetFilter<TEvent = Event> =
  | string
  | ((target: EventTarget | null, event: TEvent) => boolean);

export type TimedEventChain<TEvent = Event> = EventChain<TEvent> & {
  (milliseconds?: number): EventChain<TEvent>;
};

export type LogEventChain<TEvent = Event> = EventChain<TEvent> & {
  (label?: string): EventChain<TEvent>;
};

export type KeyEventChain = EventChain<KeyboardEvent> & {
  (key: string | readonly string[]): EventChain<KeyboardEvent>;
};

export type TargetEventChain<TEvent = Event> = EventChain<TEvent> & {
  (filter: EventTargetFilter<TEvent>): EventChain<TEvent>;
};


export type GlobalEventChain<TEvent = Event> = {
  [K in Exclude<keyof EventChain<TEvent>, 'global' | 'handler'>]: EventChain<TEvent>[K] extends EventChain<infer U>
    ? GlobalEventChain<U>
    : EventChain<TEvent>[K];
} & {
  handler(handler: (event: TEvent) => unknown): () => void;
};

export type EventChain<TEvent = Event> = {
  /**
   * Continue the chain only when the condition is true.
   *
   * @example
   * onClick={event.if(() => canSave).prevent.handler(save)}
   * onKeyDown={event.key('Enter').if((e) => !e.repeat).handler(submit)}
   */
  if(condition: EventCondition<TEvent>): EventChain<TEvent>;
  readonly prevent: EventChain<TEvent>;
  readonly stop: EventChain<TEvent>;
  readonly stopImmediate: EventChain<TEvent>;
  readonly once: EventChain<TEvent>;
  readonly self: EventChain<TEvent>;
  readonly trusted: EventChain<TEvent>;
  readonly left: EventChain<TEvent>;
  readonly middle: EventChain<MouseEvent>;
  readonly right: EventChain<TEvent>;
  readonly up: EventChain<KeyboardEvent>;
  readonly down: EventChain<KeyboardEvent>;
  readonly enter: EventChain<KeyboardEvent>;
  readonly esc: EventChain<KeyboardEvent>;
  readonly del: EventChain<KeyboardEvent>;
  readonly tab: EventChain<KeyboardEvent>;
  readonly space: EventChain<KeyboardEvent>;
  readonly target: TargetEventChain<TEvent>;
  readonly debounce: TimedEventChain<TEvent>;
  readonly throttle: TimedEventChain<TEvent>;
  readonly cooldown: TimedEventChain<TEvent>;
  readonly log: LogEventChain<TEvent>;
  readonly capture: EventChain<TEvent>;
  readonly passive: EventChain<TEvent>;
  readonly silent: EventChain<TEvent>;
  readonly trap: EventChain<TEvent>;
  readonly outside: EventChain<TEvent>;
  closest(selector: string): EventChain<TEvent>;

  readonly touch: EventChain<CustomEvent<any>>;
  fit(arg1?: any, arg2?: any, arg3?: any): EventChain<TEvent>;
  sync(obj: any, xProp?: string, yProp?: string): EventChain<TEvent>;
  moved(threshold: number | string, direction?: string): EventChain<TEvent>;

  readonly mod: EventChain<KeyboardEvent>;
  readonly ctrl: EventChain<KeyboardEvent>;
  readonly meta: EventChain<KeyboardEvent>;
  readonly shift: EventChain<KeyboardEvent>;
  readonly alt: EventChain<KeyboardEvent>;
  readonly key: KeyEventChain;
  readonly click: EventChain<MouseEvent>;
  readonly dblClick: EventChain<MouseEvent>;
  readonly mouseEnter: EventChain<MouseEvent>;
  readonly mouseLeave: EventChain<MouseEvent>;
  readonly mouseMove: EventChain<MouseEvent>;
  readonly mouseDown: EventChain<MouseEvent>;
  readonly mouseUp: EventChain<MouseEvent>;
  readonly keyDown: EventChain<KeyboardEvent>;
  readonly keyUp: EventChain<KeyboardEvent>;
  readonly keyPress: EventChain<KeyboardEvent>;
  readonly focus: EventChain<FocusEvent>;
  readonly blur: EventChain<FocusEvent>;
  readonly input: EventChain<InputEvent>;
  readonly change: EventChain<Event>;
  readonly submit: EventChain<SubmitEvent>;
  readonly pointerDown: EventChain<PointerEvent>;
  readonly pointerUp: EventChain<PointerEvent>;
  readonly pointerMove: EventChain<PointerEvent>;
  readonly pointerEnter: EventChain<PointerEvent>;
  readonly pointerLeave: EventChain<PointerEvent>;
  readonly touchStart: EventChain<TouchEvent>;
  readonly touchEnd: EventChain<TouchEvent>;
  readonly touchMove: EventChain<TouchEvent>;
  readonly touchCancel: EventChain<TouchEvent>;
  readonly global: {
    handler(handler: (event: TEvent) => unknown): () => void;
  };
  readonly in: EventChain<TEvent>;
  readonly out: EventChain<TEvent>;

  /**
   * Configure an IntersectionObserver to observe element visibility.
   * 
   * @example
   * // Trigger when more than 50% visible
   * <div onIntersect={event.intersect(0.5).in.handler(handler)} />
   * 
   * // Trigger when leaving the viewport
   * <div onIntersect={event.intersect.out.handler(handler)} />
   * 
   * // Trigger with custom root element and options
   * <Box onIntersect={event.intersect({ root: appRef, threshold: 0.5 }).out.handler(handler)} />
   */
  intersect(optionsOrThreshold?: import('./intersect').IntersectOptions | number): EventChain<CustomEvent<IntersectionObserverEntry>>;
  hotkey(keys: string | readonly string[]): GlobalEventChain<KeyboardEvent>;
  emit(handle: ComponentHandle, name: string, payload?: unknown): boolean;
  handler<TResult>(handler: (event: TEvent) => TResult): ((event: TEvent) => void) & EventChain<TEvent>;

  /** Track an async operation by name. Starts immediately. */
  track(name: string, promise: Promise<unknown>): import('./track').TrackHandle;
  track(name: string, fn: (signal: AbortSignal) => Promise<unknown>): import('./track').TrackHandle;
  track(promise: Promise<unknown>): import('./track').TrackHandle;

  /** Query track state. */
  pending(name?: string): boolean;
  resolved(name?: string): boolean;
  rejected(name?: string): boolean;
  value<T = unknown>(name: string): T | undefined;
  reason(name: string): unknown;
  cancel(name?: string): void;
};
