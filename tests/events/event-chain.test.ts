import { afterEach, describe, expect, test, vi } from 'vitest';
import { event } from 'auwla/events';

describe('event chain utilities', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  test('chains prevent, stop, self, and handler', () => {
    const parent = document.createElement('div');
    const button = document.createElement('button');
    const child = document.createElement('span');
    const calls: Event[] = [];
    let parentCalls = 0;

    button.append(child);
    parent.append(button);
    parent.addEventListener('click', () => {
      parentCalls++;
    });

    button.addEventListener('click', event.click.self.handler((mouseEvent) => {
      calls.push(mouseEvent);
    }));

    const childClick = new MouseEvent('click', { bubbles: true, cancelable: true });
    child.dispatchEvent(childClick);

    expect(calls).toHaveLength(0);
    expect(parentCalls).toBe(1);

    const buttonClick = new MouseEvent('click', { bubbles: true, cancelable: true });
    button.addEventListener('click', event.prevent.stop.handler(() => {
      calls.push(buttonClick);
    }));
    button.dispatchEvent(buttonClick);

    expect(calls).toEqual([buttonClick, buttonClick]);
    expect(buttonClick.defaultPrevented).toBe(true);
    expect(parentCalls).toBe(1);
  });

  test('once runs the wrapped handler one time', () => {
    const handler = vi.fn();
    const wrapped = event.once.handler(handler);
    const click = new MouseEvent('click');

    wrapped(click);
    wrapped(click);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(click);
  });

  test('self uses the composed event origin', () => {
    const host = document.createElement('div');
    const shadow = host.attachShadow({ mode: 'open' });
    const child = document.createElement('button');
    const handler = vi.fn();

    shadow.append(child);
    host.addEventListener('click', event.self.handler(handler));

    child.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
    host.dispatchEvent(new MouseEvent('click'));

    expect(handler).toHaveBeenCalledTimes(1);
  });

  test('stopImmediate prevents later listeners on the same target', () => {
    const button = document.createElement('button');
    const first = vi.fn();
    const second = vi.fn();

    button.addEventListener('click', event.stopImmediate.handler(first));
    button.addEventListener('click', second);
    button.dispatchEvent(new MouseEvent('click'));

    expect(first).toHaveBeenCalledTimes(1);
    expect(second).not.toHaveBeenCalled();
  });

  test('target and mouse button filters gate handlers', () => {
    const parent = document.createElement('div');
    const save = document.createElement('button');
    const cancel = document.createElement('button');
    const targetHandler = vi.fn();
    const leftHandler = vi.fn();
    const rightHandler = vi.fn();

    save.className = 'save';
    parent.append(save, cancel);
    parent.addEventListener('click', event.target('.save').handler(targetHandler));

    cancel.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    save.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    event.left.handler(leftHandler)(new MouseEvent('mousedown', { button: 0 }));
    event.left.handler(leftHandler)(new MouseEvent('mousedown', { button: 2 }));
    event.right.handler(rightHandler)(new MouseEvent('mousedown', { button: 2 }));

    expect(targetHandler).toHaveBeenCalledTimes(1);
    expect(leftHandler).toHaveBeenCalledTimes(1);
    expect(rightHandler).toHaveBeenCalledTimes(1);
  });

  test('typed event entry points infer handler event parameters', () => {
    const inputHandler = event.input.handler((inputEvent) => inputEvent.data);
    const pointerHandler = event.pointerMove.handler((pointerEvent) => pointerEvent.clientX);
    const submitHandler = event.submit.prevent.handler((submitEvent) => submitEvent.submitter);

    expect(typeof inputHandler).toBe('function');
    expect(typeof pointerHandler).toBe('function');
    expect(typeof submitHandler).toBe('function');
  });

  test('key filters keyboard events by key name', () => {
    const handler = vi.fn();
    const wrapped = event.key('Enter').handler(handler);
    const enter = new KeyboardEvent('keydown', { key: 'Enter' });
    const escape = new KeyboardEvent('keydown', { key: 'Escape' });

    wrapped(escape);
    wrapped(enter);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(enter);
  });

  test('key accepts multiple key names and composes with prevent', () => {
    const handler = vi.fn();
    const wrapped = event.key(['Enter', 'NumpadEnter']).prevent.handler(handler);
    const tab = new KeyboardEvent('keydown', { key: 'Tab', cancelable: true });
    const numpadEnter = new KeyboardEvent('keydown', { key: 'NumpadEnter', cancelable: true });

    wrapped(tab);
    wrapped(numpadEnter);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(numpadEnter);
    expect(tab.defaultPrevented).toBe(false);
    expect(numpadEnter.defaultPrevented).toBe(true);
  });

  test('mod and modifier-key filters compose with key filters', () => {
    const modHandler = vi.fn();
    const ctrlShiftHandler = vi.fn();
    const modK = event.mod.key('k').handler(modHandler);
    const ctrlShiftK = event.ctrl.shift.key('k').handler(ctrlShiftHandler);

    modK(new KeyboardEvent('keydown', { key: 'k' }));
    modK(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }));
    modK(new KeyboardEvent('keydown', { key: 'k', metaKey: true }));

    ctrlShiftK(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }));
    ctrlShiftK(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, shiftKey: true }));

    expect(modHandler).toHaveBeenCalledTimes(2);
    expect(ctrlShiftHandler).toHaveBeenCalledTimes(1);
  });

  test('debounce runs handlers immediately but delays the commit signal', async () => {
    vi.useFakeTimers();
    const handler = vi.fn();
    const wrapped = event.debounce(100).handler(handler);
    const first = new Event('input');
    const second = new Event('input');

    const firstPending = wrapped(first) as unknown as Promise<void>;
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenLastCalledWith(first);

    vi.advanceTimersByTime(50);
    const secondPending = wrapped(second) as unknown as Promise<void>;
    expect(handler).toHaveBeenCalledTimes(2);
    expect(handler).toHaveBeenLastCalledWith(second);

    vi.advanceTimersByTime(99);

    expect(secondPending).toBe(firstPending);

    let settled = false;
    void secondPending.then(() => {
      settled = true;
    });
    await Promise.resolve();
    expect(settled).toBe(false);

    vi.advanceTimersByTime(1);
    await secondPending;

    expect(settled).toBe(true);
  });

  test('throttle runs immediately and then trails with the latest event', () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    const handler = vi.fn();
    const wrapped = event.throttle(100).handler(handler);
    const first = new Event('pointermove');
    const second = new Event('pointermove');
    const third = new Event('pointermove');

    wrapped(first);
    vi.advanceTimersByTime(30);
    wrapped(second);
    vi.advanceTimersByTime(30);
    wrapped(third);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(first);

    vi.advanceTimersByTime(40);

    expect(handler).toHaveBeenCalledTimes(2);
    expect(handler).toHaveBeenLastCalledWith(third);
  });

  test('cooldown ignores events until the delay passes', () => {
    vi.useFakeTimers();
    const handler = vi.fn();
    const wrapped = event.cooldown(100).handler(handler);
    const first = new Event('click');
    const second = new Event('click');
    const third = new Event('click');

    wrapped(first);
    wrapped(second);
    vi.advanceTimersByTime(100);
    wrapped(third);

    expect(handler).toHaveBeenCalledTimes(2);
    expect(handler).toHaveBeenNthCalledWith(1, first);
    expect(handler).toHaveBeenNthCalledWith(2, third);
  });

  test('log can be used with or without a label', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const click = new MouseEvent('click');

    event.log.handler(() => {})(click);
    event.log('clicked').handler(() => {})(click);

    expect(log).toHaveBeenNthCalledWith(1, click);
    expect(log).toHaveBeenNthCalledWith(2, 'clicked', click);
  });

  test('emit is available on the event utility object', () => {
    const handle = {
      _id: 'test',
      _invalidate() {},
    };

    expect(typeof event.emit).toBe('function');
    expect(event.emit(handle, 'saved', { id: 1 })).toBe(false);
  });
});
