import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { event } from 'auwla/events';
import '../../src/events/hotkey';

describe('global hotkeys', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  test('registers single key and fires', () => {
    const handler = vi.fn();
    const unbind = event.hotkey('esc').handler(handler);

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(handler).toHaveBeenCalledTimes(1);

    unbind();
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(handler).toHaveBeenCalledTimes(1); // Unbound, so still 1
  });

  test('registers modifiers and matches combo case-insensitively', () => {
    const handler = vi.fn();
    const unbind = event.hotkey('ctrl+shift+s').prevent.handler(handler);

    // Wrong combo (only ctrl)
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 's', ctrlKey: true }));
    expect(handler).not.toHaveBeenCalled();

    // Right combo
    const matchEvent = new KeyboardEvent('keydown', { key: 'S', ctrlKey: true, shiftKey: true, cancelable: true });
    window.dispatchEvent(matchEvent);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(matchEvent.defaultPrevented).toBe(true);

    unbind();
  });

  test('ignores hotkeys in input/textarea unless modifier is present', () => {
    const singleKeyHandler = vi.fn();
    const modifierHandler = vi.fn();

    const unbind1 = event.hotkey('s').handler(singleKeyHandler);
    const unbind2 = event.hotkey('ctrl+s').handler(modifierHandler);

    // Create a text input and focus it
    const input = document.createElement('input');
    input.type = 'text';
    document.body.append(input);
    input.focus();

    // Dispatch single key press
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 's', bubbles: true }));
    expect(singleKeyHandler).not.toHaveBeenCalled();

    // Dispatch modifier combo key press
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 's', ctrlKey: true, bubbles: true }));
    expect(modifierHandler).toHaveBeenCalledTimes(1);

    input.blur();
    input.remove();
    unbind1();
    unbind2();
  });

  test('supports key sequences with timing window', () => {
    const handler = vi.fn();
    const unbind = event.hotkey('g i').handler(handler);

    // Press g
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'g' }));
    expect(handler).not.toHaveBeenCalled();

    // Press i within 1000ms
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'i' }));
    expect(handler).toHaveBeenCalledTimes(1);

    // Start sequence again
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'g' }));
    
    // Advance timers by 1001ms (causes timeout)
    vi.advanceTimersByTime(1001);
    
    // Press i after timeout
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'i' }));
    expect(handler).toHaveBeenCalledTimes(1); // Timeout, so still 1

    unbind();
  });

  test('supports multiple combinations in list', () => {
    const handler = vi.fn();
    const unbind = event.hotkey(['ctrl+k', 'meta+k']).handler(handler);

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }));
    expect(handler).toHaveBeenCalledTimes(1);

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }));
    expect(handler).toHaveBeenCalledTimes(2);

    unbind();
  });

  test('clears sequence timers on unbind', () => {
    const handler = vi.fn();
    const unbind = event.hotkey('g i').handler(handler);

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'g' }));
    expect(handler).not.toHaveBeenCalled();

    unbind();

    // No pending timers should remain after unbind
    expect(vi.getTimerCount()).toBe(0);

    // Dispatching 'i' after unbind should not fire (listener removed)
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'i' }));
    expect(handler).not.toHaveBeenCalled();
  });
});
