import type { ComponentHandle } from '../runtime/types';

export type RuntimeEventHandler<TEvent = any> = (event: TEvent) => unknown;

export type WrappedEventHandler<THandler extends RuntimeEventHandler> = (
  event: Parameters<THandler>[0],
) => void;

export type EventModifier = (handler: RuntimeEventHandler) => RuntimeEventHandler;

/**
 * Gate for `event.if(...)`.
 *
 * A boolean snapshots ordinary closure state at render time. A predicate runs
 * at event time and can inspect the event before deciding whether the rest of
 * the chain should continue.
 */
export type EventCondition<TEvent = Event> = boolean | ((event: TEvent) => boolean);

export type TimedEventChain<TEvent = Event> = EventChain<TEvent> & {
  (milliseconds?: number): EventChain<TEvent>;
};

export type LogEventChain<TEvent = Event> = EventChain<TEvent> & {
  (label?: string): EventChain<TEvent>;
};

export type KeyEventChain = EventChain<KeyboardEvent> & {
  (key: string | readonly string[]): EventChain<KeyboardEvent>;
};

export type EventChain<TEvent = Event> = {
  /**
   * Continue the chain only when the condition is true.
   *
   * @example
   * onClick={event.if(canSave).prevent.handler(save)}
   * onKeyDown={event.key('Enter').if((e) => !e.repeat).handler(submit)}
   */
  if(condition: EventCondition<TEvent>): EventChain<TEvent>;
  readonly prevent: EventChain<TEvent>;
  readonly stop: EventChain<TEvent>;
  readonly once: EventChain<TEvent>;
  readonly self: EventChain<TEvent>;
  readonly debounce: TimedEventChain<TEvent>;
  readonly throttle: TimedEventChain<TEvent>;
  readonly cooldown: TimedEventChain<TEvent>;
  readonly log: LogEventChain<TEvent>;
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
  emit(handle: ComponentHandle, name: string, payload?: unknown): boolean;
  handler<TResult>(handler: (event: TEvent) => TResult): (event: TEvent) => void;
};
