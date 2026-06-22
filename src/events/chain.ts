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

// Define EventChainState interface for strong typing of prototype methods
interface EventChainState {
  _modifiers: readonly EventModifier[];
  _eventName: string | undefined;
  _isGlobal: boolean | undefined;
  _handlers: readonly RuntimeEventHandler[];
}

// EventChainProto inherits from Function.prototype so functions (like callables)
// can be set as event chains directly.
const EventChainProto = Object.create(Function.prototype);

// Assign functions/methods directly to prototype
EventChainProto.if = function(this: EventChainState, condition: boolean | ((event: unknown) => boolean)) {
  return createEventChain(appendModifier(this._modifiers, ifModifier(condition)), this._eventName, this._isGlobal, this._handlers);
};
EventChainProto.closest = function(this: EventChainState, selector: string) {
  return createEventChain(appendModifier(this._modifiers, closestModifier(selector)), this._eventName, this._isGlobal, this._handlers);
};
EventChainProto.fit = function(this: EventChainState, arg1?: any, arg2?: any, arg3?: any) {
  return createEventChain(appendModifier(this._modifiers, touchFitModifier(arg1, arg2, arg3)), this._eventName, this._isGlobal, this._handlers);
};
EventChainProto.sync = function(this: EventChainState, obj: any, xProp?: string, yProp?: string) {
  return createEventChain(appendModifier(this._modifiers, touchSyncModifier(obj, xProp, yProp)), this._eventName, this._isGlobal, this._handlers);
};
EventChainProto.moved = function(this: EventChainState, threshold: number | string, direction?: string) {
  return createEventChain(appendModifier(this._modifiers, touchMovedModifier(threshold, direction)), this._eventName, this._isGlobal, this._handlers);
};
EventChainProto.intersect = function(this: EventChainState, optionsOrThreshold?: import('./intersect').IntersectOptions | number) {
  return createEventChain([intersectModifier(optionsOrThreshold)], 'intersect', this._isGlobal, this._handlers);
};
EventChainProto.hotkey = function(this: EventChainState, keys: string | readonly string[]) {
  return createEventChain([hotkeyModifier(keys)], 'keydown', true, this._handlers);
};
EventChainProto.emit = emit;
EventChainProto.handler = function(this: EventChainState, handler: RuntimeEventHandler) {
  const modifiers = this._modifiers;
  const eventName = this._eventName;
  const isGlobal = this._isGlobal;
  const handlers = this._handlers;

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

  return createEventChain([], undefined, isGlobal, allHandlers, combined);
};

// Define property getters dynamically
const customGetters: Record<string, (self: EventChainState) => any> = {
  target: (self) => targetChain(self._modifiers, self._eventName, self._isGlobal, self._handlers),
  debounce: (self) => timedChain(self._modifiers, debounceModifier, self._eventName, self._isGlobal, self._handlers),
  throttle: (self) => timedChain(self._modifiers, throttleModifier, self._eventName, self._isGlobal, self._handlers),
  cooldown: (self) => timedChain(self._modifiers, cooldownModifier, self._eventName, self._isGlobal, self._handlers),
  log: (self) => logChain(self._modifiers, self._eventName, self._isGlobal, self._handlers),
  key: (self) => keyChain(self._modifiers, self._eventName, self._isGlobal, self._handlers),
  global: (self) => createEventChain(self._modifiers, self._eventName, true, self._handlers),
};

for (const [prop, getVal] of Object.entries(customGetters)) {
  Object.defineProperty(EventChainProto, prop, {
    get(this: EventChainState) { return getVal(this); },
    configurable: true
  });
}

for (const [prop, modifier] of Object.entries(simpleModifiers)) {
  Object.defineProperty(EventChainProto, prop, {
    get(this: EventChainState) { return createEventChain(appendModifier(this._modifiers, modifier), this._eventName, this._isGlobal, this._handlers); },
    configurable: true
  });
}

for (const [prop, name] of Object.entries(eventNames)) {
  Object.defineProperty(EventChainProto, prop, {
    get(this: EventChainState) { return createEventChain(this._modifiers, name, this._isGlobal, this._handlers); },
    configurable: true
  });
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
  return createEventChain(appendModifier(modifiers, modifierFactory()), eventName, isGlobal, handlers, callable) as unknown as TimedEventChain<TEvent>;
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
  return createEventChain(appendModifier(modifiers, logModifier()), eventName, isGlobal, handlers, callable) as unknown as LogEventChain<TEvent>;
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
  return createEventChain(modifiers, eventName, isGlobal, handlers, callable) as unknown as KeyEventChain;
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
  return createEventChain(modifiers, eventName, isGlobal, handlers, callable) as unknown as TargetEventChain<TEvent>;
}

export function createEventChain<TEvent = Event>(
  modifiers: readonly EventModifier[] = [],
  eventName?: string,
  isGlobal?: boolean,
  handlers: readonly RuntimeEventHandler[] = [],
  target: any = {},
): EventChain<TEvent> {
  const chain = target;
  if (Object.getPrototypeOf(chain) !== EventChainProto) {
    Object.setPrototypeOf(chain, EventChainProto);
  }
  chain._modifiers = modifiers;
  chain._eventName = eventName;
  chain._isGlobal = isGlobal;
  chain._handlers = handlers;
  return chain as EventChain<TEvent>;
}
