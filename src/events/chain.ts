import { logModifier, onceModifier, preventModifier, selfModifier, stopModifier } from './modifiers';
import { cooldownModifier, debounceModifier, throttleModifier } from './timing';
import { emit } from './emit';
import type { EventChain, EventModifier, LogEventChain, RuntimeEventHandler, TimedEventChain } from './types';

function applyModifiers(handler: RuntimeEventHandler, modifiers: readonly EventModifier[]): RuntimeEventHandler {
  let wrapped = handler;
  for (let index = modifiers.length - 1; index >= 0; index--) {
    wrapped = modifiers[index]!(wrapped);
  }
  return wrapped;
}

function appendModifier(modifiers: readonly EventModifier[], modifier: EventModifier): EventModifier[] {
  return [...modifiers, modifier];
}

function defineChainAccessors<TTarget extends object>(
  target: TTarget,
  modifiers: readonly EventModifier[],
): TTarget & EventChain<any> {
  return Object.defineProperties(target, {
    prevent: {
      get: () => createEventChain(appendModifier(modifiers, preventModifier)),
    },
    stop: {
      get: () => createEventChain(appendModifier(modifiers, stopModifier)),
    },
    once: {
      get: () => createEventChain(appendModifier(modifiers, onceModifier)),
    },
    self: {
      get: () => createEventChain(appendModifier(modifiers, selfModifier)),
    },
    debounce: {
      get: () => timedChain(modifiers, debounceModifier),
    },
    throttle: {
      get: () => timedChain(modifiers, throttleModifier),
    },
    cooldown: {
      get: () => timedChain(modifiers, cooldownModifier),
    },
    log: {
      get: () => logChain(modifiers),
    },
    click: {
      get: () => createEventChain<MouseEvent>(modifiers),
    },
    dblClick: {
      get: () => createEventChain<MouseEvent>(modifiers),
    },
    mouseEnter: {
      get: () => createEventChain<MouseEvent>(modifiers),
    },
    mouseLeave: {
      get: () => createEventChain<MouseEvent>(modifiers),
    },
    mouseMove: {
      get: () => createEventChain<MouseEvent>(modifiers),
    },
    mouseDown: {
      get: () => createEventChain<MouseEvent>(modifiers),
    },
    mouseUp: {
      get: () => createEventChain<MouseEvent>(modifiers),
    },
    keyDown: {
      get: () => createEventChain<KeyboardEvent>(modifiers),
    },
    keyUp: {
      get: () => createEventChain<KeyboardEvent>(modifiers),
    },
    keyPress: {
      get: () => createEventChain<KeyboardEvent>(modifiers),
    },
    focus: {
      get: () => createEventChain<FocusEvent>(modifiers),
    },
    blur: {
      get: () => createEventChain<FocusEvent>(modifiers),
    },
    input: {
      get: () => createEventChain<InputEvent>(modifiers),
    },
    change: {
      get: () => createEventChain<Event>(modifiers),
    },
    submit: {
      get: () => createEventChain<SubmitEvent>(modifiers),
    },
    pointerDown: {
      get: () => createEventChain<PointerEvent>(modifiers),
    },
    pointerUp: {
      get: () => createEventChain<PointerEvent>(modifiers),
    },
    pointerMove: {
      get: () => createEventChain<PointerEvent>(modifiers),
    },
    pointerEnter: {
      get: () => createEventChain<PointerEvent>(modifiers),
    },
    pointerLeave: {
      get: () => createEventChain<PointerEvent>(modifiers),
    },
    touchStart: {
      get: () => createEventChain<TouchEvent>(modifiers),
    },
    touchEnd: {
      get: () => createEventChain<TouchEvent>(modifiers),
    },
    touchMove: {
      get: () => createEventChain<TouchEvent>(modifiers),
    },
    touchCancel: {
      get: () => createEventChain<TouchEvent>(modifiers),
    },
    handler: {
      value: (handler: RuntimeEventHandler) => applyModifiers(handler, modifiers),
    },
    emit: {
      value: emit,
    },
  }) as TTarget & EventChain<any>;
}

function timedChain<TEvent>(
  modifiers: readonly EventModifier[],
  modifierFactory: (milliseconds?: number) => EventModifier,
): TimedEventChain<TEvent> {
  const callable = ((milliseconds?: number) => (
    createEventChain<TEvent>(appendModifier(modifiers, modifierFactory(milliseconds)))
  )) as TimedEventChain<TEvent>;
  return defineChainAccessors(callable, appendModifier(modifiers, modifierFactory()));
}

function logChain<TEvent>(modifiers: readonly EventModifier[]): LogEventChain<TEvent> {
  const callable = ((label?: string) => (
    createEventChain<TEvent>(appendModifier(modifiers, logModifier(label)))
  )) as LogEventChain<TEvent>;
  return defineChainAccessors(callable, appendModifier(modifiers, logModifier()));
}

export function createEventChain<TEvent = Event>(modifiers: readonly EventModifier[] = []): EventChain<TEvent> {
  return defineChainAccessors({}, modifiers);
}
