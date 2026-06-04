import {
  ifModifier,
  onceModifier,
  preventModifier,
  selfModifier,
  stopImmediateModifier,
  stopModifier,
  targetModifier,
  trustedModifier,
  logModifier,
  leftModifier,
  rightModifier,
} from './core';
import { middleModifier } from './mouse';
import {
  keyModifier,
  ctrlModifier,
  metaModifier,
  shiftModifier,
  altModifier,
  modModifier,
  upModifier,
  downModifier,
  enterModifier,
  escModifier,
  delModifier,
  tabModifier,
  spaceModifier,
} from './keyboard';
import { cooldownModifier, debounceModifier, throttleModifier } from './timing';
import { emit } from './emit';
import { hotkeyModifier } from './hotkey';
import { track as trackFn, pending, resolved, rejected, value, reason, cancel } from './track';
import { cleanup } from '../runtime';
import { runtimeState, currentComponentId } from '../runtime/state';
import type {
  EventChain,
  EventTargetFilter,
  EventModifier,
  KeyEventChain,
  LogEventChain,
  RuntimeEventHandler,
  TargetEventChain,
  TimedEventChain,
} from './types';

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
  eventName?: string,
  isGlobal?: boolean,
): TTarget & EventChain<any> {
  return Object.defineProperties(target, {
    if: {
      value: (condition: boolean | ((event: unknown) => boolean)) => (
        createEventChain(appendModifier(modifiers, ifModifier(condition)), eventName, isGlobal)
      ),
    },
    prevent: {
      get: () => createEventChain(appendModifier(modifiers, preventModifier), eventName, isGlobal),
    },
    stop: {
      get: () => createEventChain(appendModifier(modifiers, stopModifier), eventName, isGlobal),
    },
    stopImmediate: {
      get: () => createEventChain(appendModifier(modifiers, stopImmediateModifier), eventName, isGlobal),
    },
    once: {
      get: () => createEventChain(appendModifier(modifiers, onceModifier), eventName, isGlobal),
    },
    self: {
      get: () => createEventChain(appendModifier(modifiers, selfModifier), eventName, isGlobal),
    },
    trusted: {
      get: () => createEventChain(appendModifier(modifiers, trustedModifier), eventName, isGlobal),
    },
    left: {
      get: () => createEventChain(appendModifier(modifiers, leftModifier), eventName, isGlobal),
    },
    middle: {
      get: () => createEventChain<MouseEvent>(appendModifier(modifiers, middleModifier), eventName, isGlobal),
    },
    right: {
      get: () => createEventChain(appendModifier(modifiers, rightModifier), eventName, isGlobal),
    },
    up: {
      get: () => createEventChain<KeyboardEvent>(appendModifier(modifiers, upModifier), eventName, isGlobal),
    },
    down: {
      get: () => createEventChain<KeyboardEvent>(appendModifier(modifiers, downModifier), eventName, isGlobal),
    },
    enter: {
      get: () => createEventChain<KeyboardEvent>(appendModifier(modifiers, enterModifier), eventName, isGlobal),
    },
    esc: {
      get: () => createEventChain<KeyboardEvent>(appendModifier(modifiers, escModifier), eventName, isGlobal),
    },
    del: {
      get: () => createEventChain<KeyboardEvent>(appendModifier(modifiers, delModifier), eventName, isGlobal),
    },
    tab: {
      get: () => createEventChain<KeyboardEvent>(appendModifier(modifiers, tabModifier), eventName, isGlobal),
    },
    space: {
      get: () => createEventChain<KeyboardEvent>(appendModifier(modifiers, spaceModifier), eventName, isGlobal),
    },
    target: {
      get: () => targetChain(modifiers, eventName, isGlobal),
    },
    debounce: {
      get: () => timedChain(modifiers, debounceModifier, eventName, isGlobal),
    },
    throttle: {
      get: () => timedChain(modifiers, throttleModifier, eventName, isGlobal),
    },
    cooldown: {
      get: () => timedChain(modifiers, cooldownModifier, eventName, isGlobal),
    },
    log: {
      get: () => logChain(modifiers, eventName, isGlobal),
    },
    mod: {
      get: () => createEventChain<KeyboardEvent>(appendModifier(modifiers, modModifier), eventName, isGlobal),
    },
    ctrl: {
      get: () => createEventChain<KeyboardEvent>(appendModifier(modifiers, ctrlModifier), eventName, isGlobal),
    },
    meta: {
      get: () => createEventChain<KeyboardEvent>(appendModifier(modifiers, metaModifier), eventName, isGlobal),
    },
    shift: {
      get: () => createEventChain<KeyboardEvent>(appendModifier(modifiers, shiftModifier), eventName, isGlobal),
    },
    alt: {
      get: () => createEventChain<KeyboardEvent>(appendModifier(modifiers, altModifier), eventName, isGlobal),
    },
    key: {
      get: () => keyChain(modifiers, eventName, isGlobal),
    },
    click: {
      get: () => createEventChain<MouseEvent>(modifiers, 'click', isGlobal),
    },
    dblClick: {
      get: () => createEventChain<MouseEvent>(modifiers, 'dblclick', isGlobal),
    },
    mouseEnter: {
      get: () => createEventChain<MouseEvent>(modifiers, 'mouseenter', isGlobal),
    },
    mouseLeave: {
      get: () => createEventChain<MouseEvent>(modifiers, 'mouseleave', isGlobal),
    },
    mouseMove: {
      get: () => createEventChain<MouseEvent>(modifiers, 'mousemove', isGlobal),
    },
    mouseDown: {
      get: () => createEventChain<MouseEvent>(modifiers, 'mousedown', isGlobal),
    },
    mouseUp: {
      get: () => createEventChain<MouseEvent>(modifiers, 'mouseup', isGlobal),
    },
    keyDown: {
      get: () => createEventChain<KeyboardEvent>(modifiers, 'keydown', isGlobal),
    },
    keyUp: {
      get: () => createEventChain<KeyboardEvent>(modifiers, 'keyup', isGlobal),
    },
    keyPress: {
      get: () => createEventChain<KeyboardEvent>(modifiers, 'keypress', isGlobal),
    },
    focus: {
      get: () => createEventChain<FocusEvent>(modifiers, 'focus', isGlobal),
    },
    blur: {
      get: () => createEventChain<FocusEvent>(modifiers, 'blur', isGlobal),
    },
    input: {
      get: () => createEventChain<InputEvent>(modifiers, 'input', isGlobal),
    },
    change: {
      get: () => createEventChain<Event>(modifiers, 'change', isGlobal),
    },
    submit: {
      get: () => createEventChain<SubmitEvent>(modifiers, 'submit', isGlobal),
    },
    pointerDown: {
      get: () => createEventChain<PointerEvent>(modifiers, 'pointerdown', isGlobal),
    },
    pointerUp: {
      get: () => createEventChain<PointerEvent>(modifiers, 'pointerup', isGlobal),
    },
    pointerMove: {
      get: () => createEventChain<PointerEvent>(modifiers, 'pointermove', isGlobal),
    },
    pointerEnter: {
      get: () => createEventChain<PointerEvent>(modifiers, 'pointerenter', isGlobal),
    },
    pointerLeave: {
      get: () => createEventChain<PointerEvent>(modifiers, 'pointerleave', isGlobal),
    },
    touchStart: {
      get: () => createEventChain<TouchEvent>(modifiers, 'touchstart', isGlobal),
    },
    touchEnd: {
      get: () => createEventChain<TouchEvent>(modifiers, 'touchend', isGlobal),
    },
    touchMove: {
      get: () => createEventChain<TouchEvent>(modifiers, 'touchmove', isGlobal),
    },
    touchCancel: {
      get: () => createEventChain<TouchEvent>(modifiers, 'touchcancel', isGlobal),
    },
    global: {
      get: () => createEventChain(modifiers, eventName, true),
    },
    hotkey: {
      value: (keys: string | readonly string[]) => {
        return createEventChain<KeyboardEvent>([hotkeyModifier(keys)], 'keydown', true);
      },
    },
    handler: {
      value: (handler: RuntimeEventHandler) => {
        const wrapped = applyModifiers(handler, modifiers);
        if (isGlobal) {
          const type = eventName || 'keydown';
          if (typeof window !== 'undefined') {
            const wrap = runtimeState.activeEventWrapper ?? ((h) => h);
            const ownerId = runtimeState.activeSetupComponentId ?? currentComponentId();
            const listener = wrap(wrapped, ownerId);
            window.addEventListener(type, listener);
            const modifierCleanups = modifiers.map((m) => m.cleanup).filter(Boolean) as (() => void)[];
            const unbind = () => {
              window.removeEventListener(type, listener);
              for (const cleanupFn of modifierCleanups) {
                cleanupFn();
              }
            };
            try {
              cleanup(unbind);
            } catch (e) {
              // Ignore if setup outside component lifecycle context
            }
            return unbind;
          }
          return () => {};
        }
        return wrapped;
      },
    },
    emit: {
      value: emit,
    },
    track: {
      value: trackFn,
    },
    pending: { value: pending },
    resolved: { value: resolved },
    rejected: { value: rejected },
    value: { value: value },
    reason: { value: reason },
    cancel: { value: cancel },
  }) as TTarget & EventChain<any>;
}

function timedChain<TEvent>(
  modifiers: readonly EventModifier[],
  modifierFactory: (milliseconds?: number) => EventModifier,
  eventName?: string,
  isGlobal?: boolean,
): TimedEventChain<TEvent> {
  const callable = ((milliseconds?: number) => (
    createEventChain<TEvent>(appendModifier(modifiers, modifierFactory(milliseconds)), eventName, isGlobal)
  )) as TimedEventChain<TEvent>;
  return defineChainAccessors(callable, appendModifier(modifiers, modifierFactory()), eventName, isGlobal);
}

function logChain<TEvent>(
  modifiers: readonly EventModifier[],
  eventName?: string,
  isGlobal?: boolean,
): LogEventChain<TEvent> {
  const callable = ((label?: string) => (
    createEventChain<TEvent>(appendModifier(modifiers, logModifier(label)), eventName, isGlobal)
  )) as LogEventChain<TEvent>;
  return defineChainAccessors(callable, appendModifier(modifiers, logModifier()), eventName, isGlobal);
}

function keyChain(
  modifiers: readonly EventModifier[],
  eventName?: string,
  isGlobal?: boolean,
): KeyEventChain {
  const callable = ((key: string | readonly string[]) => (
    createEventChain<KeyboardEvent>(appendModifier(modifiers, keyModifier(key)), eventName, isGlobal)
  )) as KeyEventChain;
  return defineChainAccessors(callable, modifiers, eventName, isGlobal) as KeyEventChain;
}

function targetChain<TEvent>(
  modifiers: readonly EventModifier[],
  eventName?: string,
  isGlobal?: boolean,
): TargetEventChain<TEvent> {
  const callable = ((filter: EventTargetFilter<TEvent>) => (
    createEventChain<TEvent>(appendModifier(modifiers, targetModifier(filter)), eventName, isGlobal)
  )) as TargetEventChain<TEvent>;
  return defineChainAccessors(callable, modifiers, eventName, isGlobal) as TargetEventChain<TEvent>;
}

export function createEventChain<TEvent = Event>(
  modifiers: readonly EventModifier[] = [],
  eventName?: string,
  isGlobal?: boolean,
): EventChain<TEvent> {
  return defineChainAccessors({}, modifiers, eventName, isGlobal);
}
