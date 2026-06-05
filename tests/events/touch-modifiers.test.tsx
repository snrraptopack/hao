/** @jsxImportSource auwla */
import { describe, expect, test, vi, afterEach } from 'vitest';
import { event } from 'auwla/events';
import { createMemoApp } from 'auwla';
import { setProp } from '../../src/runtime/dom';

// Polyfill PointerEvent and pointer capture methods for JSDOM
if (typeof globalThis.PointerEvent === 'undefined') {
  class PointerEventPolyfill extends MouseEvent {
    pointerId: number;
    pointerType: string;
    constructor(type: string, init: any = {}) {
      super(type, init);
      this.pointerId = init.pointerId ?? 0;
      this.pointerType = init.pointerType ?? 'mouse';
    }
  }
  globalThis.PointerEvent = PointerEventPolyfill as any;
}

if (typeof Element.prototype.setPointerCapture === 'undefined') {
  Element.prototype.setPointerCapture = () => {};
}
if (typeof Element.prototype.releasePointerCapture === 'undefined') {
  Element.prototype.releasePointerCapture = () => {};
}

describe('new touch gesture and high/medium demand modifiers', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('capture and passive options are passed to addEventListener', () => {
    const el = document.createElement('div');
    const spy = vi.spyOn(el, 'addEventListener');
    const handler = vi.fn();
    
    setProp(el as any, 'onClick', event.capture.passive.handler(handler), undefined, (h) => h);
    
    expect(spy).toHaveBeenCalledWith('click', expect.any(Function), { capture: true, passive: true });
  });

  test('silent modifier prevents component re-render', async () => {
    const root = document.createElement('div');
    let renderCount = 0;
    const handler = vi.fn();
    
    function App() {
      return () => {
        renderCount++;
        return (
          <button onClick={event.silent.handler(handler)}>Click</button>
        );
      };
    }
    
    createMemoApp(root, <App />);
    expect(renderCount).toBe(1);
    
    root.querySelector('button')!.click();
    await new Promise<void>((resolve) => queueMicrotask(resolve));
    
    expect(handler).toHaveBeenCalledTimes(1);
    expect(renderCount).toBe(1); // Rerender did not happen
  });

  test('outside modifier triggers only on click outside', () => {
    const container = document.createElement('div');
    const dropdown = document.createElement('div');
    const button = document.createElement('button');
    container.append(dropdown, button);
    document.body.append(container);
    
    const handler = vi.fn();
    setProp(dropdown as any, 'onClick', event.outside.handler(handler), undefined, (h) => h);
    
    // Click inside the dropdown
    dropdown.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(handler).not.toHaveBeenCalled();
    
    // Click outside (on the button)
    button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(handler).toHaveBeenCalledTimes(1);
    
    container.remove();
  });

  test('closest modifier filters target elements and ancestors', () => {
    const parent = document.createElement('div');
    const button = document.createElement('button');
    const span = document.createElement('span');
    button.append(span);
    parent.append(button);
    
    const handler = vi.fn();
    parent.addEventListener('click', event.closest('button').handler(handler));
    
    // Click on span (ancestor is button)
    span.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  test('trap modifier stops propagation and prevents default', () => {
    const parent = document.createElement('div');
    const button = document.createElement('button');
    parent.append(button);
    
    let parentClicked = false;
    parent.addEventListener('click', () => {
      parentClicked = true;
    });

    const handler = vi.fn();
    button.addEventListener('click', event.trap.handler(handler));
    
    const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true });
    button.dispatchEvent(clickEvent);
    
    expect(handler).toHaveBeenCalledTimes(1);
    expect(parentClicked).toBe(false); // Propagation stopped
    expect(clickEvent.defaultPrevented).toBe(true); // Default prevented
  });

  test('touch event tracking and fit/sync modifiers', () => {
    const el = document.createElement('div');
    document.body.append(el);
    
    vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      top: 0,
      width: 100,
      height: 100,
      right: 100,
      bottom: 100,
      x: 0,
      y: 0,
      toJSON: () => {}
    });
    
    const data = { x: 0, y: 0 };
    const handler = vi.fn();
    
    el.addEventListener('touch', event.touch.fit(0, 10).sync(data).handler(handler));
    
    // Trigger pointerdown
    const down = new PointerEvent('pointerdown', { clientX: 10, clientY: 20, button: 0 });
    el.dispatchEvent(down);
    
    // Move
    const move = new PointerEvent('pointermove', { clientX: 50, clientY: 60, pointerId: 0 });
    el.dispatchEvent(move);
    
    expect(handler).toHaveBeenCalled();
    expect(data.x).toBe(40); // Initial x (0) + dx (50 - 10 = 40)
    
    el.remove();
  });

  test('declarative chaining of multiple event handlers', () => {
    const el = document.createElement('div');
    document.body.append(el);

    const leftSpy = vi.fn();
    const rightSpy = vi.fn();

    // Bind two chained moved handlers
    const combined = event.touch.moved(40, 'left').handler(leftSpy)
      .touch.moved(40, 'right').handler(rightSpy);

    el.addEventListener('touch', combined);

    // Start touch
    el.dispatchEvent(new PointerEvent('pointerdown', { clientX: 100, clientY: 100, button: 0 }));

    // Swipe left (dx = -50)
    el.dispatchEvent(new PointerEvent('pointermove', { clientX: 50, clientY: 100, pointerId: 0 }));
    expect(leftSpy).toHaveBeenCalledTimes(1);
    expect(rightSpy).not.toHaveBeenCalled();

    // End first touch gesture
    el.dispatchEvent(new PointerEvent('pointerup', { clientX: 50, clientY: 100, pointerId: 0 }));

    leftSpy.mockClear();

    // Start a new touch gesture for swipe right
    el.dispatchEvent(new PointerEvent('pointerdown', { clientX: 100, clientY: 100, button: 0 }));

    // Swipe right (dx = 50)
    el.dispatchEvent(new PointerEvent('pointermove', { clientX: 150, clientY: 100, pointerId: 0 }));
    expect(rightSpy).toHaveBeenCalledTimes(1);
    expect(leftSpy).not.toHaveBeenCalled();

    // End second touch gesture
    el.dispatchEvent(new PointerEvent('pointerup', { clientX: 150, clientY: 100, pointerId: 0 }));

    el.remove();
  });
});
