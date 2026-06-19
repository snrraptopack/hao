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
  captureModifier,
  passiveModifier,
  silentModifier,
  trapModifier,
  outsideModifier,
  closestModifier,
} from './core';
import { touchFitModifier, touchSyncModifier, touchMovedModifier } from './touch';
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
import { intersectModifier, intersectInModifier, intersectOutModifier } from './intersect';
import { emit } from './emit';
import { hotkeyModifier } from './hotkey';

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

const simpleModifiers: Record<string, EventModifier> = {
  prevent: preventModifier,
  stop: stopModifier,
  stopImmediate: stopImmediateModifier,
  once: onceModifier,
  self: selfModifier,
  trusted: trustedModifier,
  left: leftModifier,
  middle: middleModifier,
  right: rightModifier,
  up: upModifier,
  down: downModifier,
  enter: enterModifier,
  esc: escModifier,
  del: delModifier,
  tab: tabModifier,
  space: spaceModifier,
  capture: captureModifier,
  passive: passiveModifier,
  silent: silentModifier,
  trap: trapModifier,
  outside: outsideModifier,
  mod: modModifier,
  ctrl: ctrlModifier,
  meta: metaModifier,
  shift: shiftModifier,
  alt: altModifier,
  in: intersectInModifier,
  out: intersectOutModifier,
};

const eventNames: Record<string, string> = {
  touch: 'touch',
  click: 'click',
  dblClick: 'dblclick',
  mouseEnter: 'mouseenter',
  mouseLeave: 'mouseleave',
  mouseMove: 'mousemove',
  mouseDown: 'mousedown',
  mouseUp: 'mouseup',
  keyDown: 'keydown',
  keyUp: 'keyup',
  keyPress: 'keypress',
  focus: 'focus',
  blur: 'blur',
  input: 'input',
  change: 'change',
  submit: 'submit',
  pointerDown: 'pointerdown',
  pointerUp: 'pointerup',
  pointerMove: 'pointermove',
  pointerEnter: 'pointerenter',
  pointerLeave: 'pointerleave',
  touchStart: 'touchstart',
  touchEnd: 'touchend',
  touchMove: 'touchmove',
  touchCancel: 'touchcancel',
};

function defineChainAccessors<TTarget extends object>(
  target: TTarget,
  modifiers: readonly EventModifier[],
  eventName?: string,
  isGlobal?: boolean,
  handlers: readonly RuntimeEventHandler[] = [],
): TTarget & EventChain<any> {
  const props: PropertyDescriptorMap = {
    if: {
      value: (condition: boolean | ((event: unknown) => boolean)) => (
        createEventChain(appendModifier(modifiers, ifModifier(condition)), eventName, isGlobal, handlers)
      ),
    },
    target: {
      get: () => targetChain(modifiers, eventName, isGlobal, handlers),
    },
    debounce: {
      get: () => timedChain(modifiers, debounceModifier, eventName, isGlobal, handlers),
    },
    throttle: {
      get: () => timedChain(modifiers, throttleModifier, eventName, isGlobal, handlers),
    },
    cooldown: {
      get: () => timedChain(modifiers, cooldownModifier, eventName, isGlobal, handlers),
    },
    log: {
      get: () => logChain(modifiers, eventName, isGlobal, handlers),
    },
    closest: {
      value: (selector: string) => createEventChain(appendModifier(modifiers, closestModifier(selector)), eventName, isGlobal, handlers),
    },
    fit: {
      value: (arg1?: any, arg2?: any, arg3?: any) => createEventChain(appendModifier(modifiers, touchFitModifier(arg1, arg2, arg3)), eventName, isGlobal, handlers),
    },
    sync: {
      value: (obj: any, xProp?: string, yProp?: string) => createEventChain(appendModifier(modifiers, touchSyncModifier(obj, xProp, yProp)), eventName, isGlobal, handlers),
    },
    moved: {
      value: (threshold: number | string, direction?: string) => createEventChain(appendModifier(modifiers, touchMovedModifier(threshold, direction)), eventName, isGlobal, handlers),
    },
    key: {
      get: () => keyChain(modifiers, eventName, isGlobal, handlers),
    },
    global: {
      get: () => createEventChain(modifiers, eventName, true, handlers),
    },
    intersect: {
      value: (optionsOrThreshold?: import('./intersect').IntersectOptions | number) => {
        return createEventChain([intersectModifier(optionsOrThreshold)], 'intersect', isGlobal, handlers);
      },
    },
    hotkey: {
      value: (keys: string | readonly string[]) => {
        return createEventChain<KeyboardEvent>([hotkeyModifier(keys)], 'keydown', true, handlers);
      },
    },
    handler: {
      value: (handler: RuntimeEventHandler) => {
        const wrapped = applyModifiers(handler, modifiers);
        const allHandlers = [...handlers, wrapped];
        
        const combined = (event: any) => {
          let result;
          for (const h of allHandlers) {
            const r = h(event);
            if (r !== undefined) {
              result = r;
            }
          }
          return result;
        };

        // Propagate setup options
        for (const modifier of modifiers) {
          if ((modifier as any).__capture) (combined as any).__capture = true;
          if ((modifier as any).__passive) (combined as any).__passive = true;
          if ((modifier as any).__outside) (combined as any).__outside = true;
        }
        for (const h of handlers) {
          if ((h as any).__capture) (combined as any).__capture = true;
          if ((h as any).__passive) (combined as any).__passive = true;
          if ((h as any).__outside) (combined as any).__outside = true;
        }

        if (isGlobal) {
          const type = eventName || 'keydown';
          if (typeof window !== 'undefined') {
            const wrap = runtimeState.activeEventWrapper ?? ((h) => h);
            const ownerId = runtimeState.activeSetupComponentId ?? currentComponentId();
            const listener = wrap(combined, ownerId);
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

        return defineChainAccessors(combined, [], undefined, isGlobal, allHandlers);
      },
    },
    emit: {
      value: emit,
    },
  };

  for (const [prop, modifier] of Object.entries(simpleModifiers)) {
    props[prop] = {
      get: () => createEventChain(appendModifier(modifiers, modifier), eventName, isGlobal, handlers),
    };
  }

  for (const [prop, name] of Object.entries(eventNames)) {
    props[prop] = {
      get: () => createEventChain(modifiers, name, isGlobal, handlers),
    };
  }

  return Object.defineProperties(target, props) as TTarget & EventChain<any>;
}

function timedChain<TEvent>(
  modifiers: readonly EventModifier[],
  modifierFactory: (milliseconds?: number) => EventModifier,
  eventName?: string,
  isGlobal?: boolean,
  handlers: readonly RuntimeEventHandler[] = [],
): TimedEventChain<TEvent> {
  const callable = ((milliseconds?: number) => (
    createEventChain<TEvent>(appendModifier(modifiers, modifierFactory(milliseconds)), eventName, isGlobal, handlers)
  )) as TimedEventChain<TEvent>;
  return defineChainAccessors(callable, appendModifier(modifiers, modifierFactory()), eventName, isGlobal, handlers);
}

function logChain<TEvent>(
  modifiers: readonly EventModifier[],
  eventName?: string,
  isGlobal?: boolean,
  handlers: readonly RuntimeEventHandler[] = [],
): LogEventChain<TEvent> {
  const callable = ((label?: string) => (
    createEventChain<TEvent>(appendModifier(modifiers, logModifier(label)), eventName, isGlobal, handlers)
  )) as LogEventChain<TEvent>;
  return defineChainAccessors(callable, appendModifier(modifiers, logModifier()), eventName, isGlobal, handlers);
}

function keyChain(
  modifiers: readonly EventModifier[],
  eventName?: string,
  isGlobal?: boolean,
  handlers: readonly RuntimeEventHandler[] = [],
): KeyEventChain {
  const callable = ((key: string | readonly string[]) => (
    createEventChain<KeyboardEvent>(appendModifier(modifiers, keyModifier(key)), eventName, isGlobal, handlers)
  )) as KeyEventChain;
  return defineChainAccessors(callable, modifiers, eventName, isGlobal, handlers) as KeyEventChain;
}

function targetChain<TEvent>(
  modifiers: readonly EventModifier[],
  eventName?: string,
  isGlobal?: boolean,
  handlers: readonly RuntimeEventHandler[] = [],
): TargetEventChain<TEvent> {
  const callable = ((filter: EventTargetFilter<TEvent>) => (
    createEventChain<TEvent>(appendModifier(modifiers, targetModifier(filter)), eventName, isGlobal, handlers)
  )) as TargetEventChain<TEvent>;
  return defineChainAccessors(callable, modifiers, eventName, isGlobal, handlers) as TargetEventChain<TEvent>;
}

export function createEventChain<TEvent = Event>(
  modifiers: readonly EventModifier[] = [],
  eventName?: string,
  isGlobal?: boolean,
  handlers: readonly RuntimeEventHandler[] = [],
): EventChain<TEvent> {
  return defineChainAccessors({}, modifiers, eventName, isGlobal, handlers);
}
