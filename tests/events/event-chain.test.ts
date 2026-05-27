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

  test('typed event entry points infer handler event parameters', () => {
    const inputHandler = event.input.handler((inputEvent) => inputEvent.data);
    const pointerHandler = event.pointerMove.handler((pointerEvent) => pointerEvent.clientX);
    const submitHandler = event.submit.prevent.handler((submitEvent) => submitEvent.submitter);

    expect(typeof inputHandler).toBe('function');
    expect(typeof pointerHandler).toBe('function');
    expect(typeof submitHandler).toBe('function');
  });

  test('debounce waits for quiet time and uses the latest event', async () => {
    vi.useFakeTimers();
    const handler = vi.fn();
    const wrapped = event.debounce(100).handler(handler);
    const first = new Event('input');
    const second = new Event('input');

    const firstPending = wrapped(first) as unknown as Promise<void>;
    vi.advanceTimersByTime(50);
    const secondPending = wrapped(second) as unknown as Promise<void>;
    vi.advanceTimersByTime(99);

    expect(secondPending).toBe(firstPending);
    expect(handler).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    await secondPending;

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(second);
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
