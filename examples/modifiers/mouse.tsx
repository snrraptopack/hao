import { component, commit } from 'auwla';
import { event } from 'auwla/events';
import type {} from 'auwla/jsx-runtime';

/**
 * Interactive Mouse Modifiers demo.
 * Demonstrates local mouse button event filtering and prevent default checks.
 */
export function MouseModifiersDemo() {
  const self = component();
  let toasts: Array<{ id: string; text: string }> = [];
  let toastId = 0;

  // Custom context menu coordinates and visibility
  let contextMenu: { x: number; y: number; visible: boolean } = { x: 0, y: 0, visible: false };

  function showToast(text: string) {
    const id = String(toastId++);
    toasts.push({ id, text });
    setTimeout(() => {
      toasts = toasts.filter(t => t.id !== id);
      commit(self); // commit only inside async setTimeout
    }, 2200);
  }

  function closeMenu() {
    if (contextMenu.visible) {
      contextMenu.visible = false;
    }
  }

  const handleMouseDown = (e: MouseEvent) => {
    event.left.handler(() => showToast('Left Click (Primary) intercepted'))(e);
    event.middle.handler(() => showToast('Middle Click (Scroll Wheel) intercepted'))(e);
  };

  return () => (
    <div class="docs-section" onClick={closeMenu}>
      <h1>Mouse Modifiers</h1>
      <p>Inspect and filter mouse clicks directly at the event binding level.</p>

      <div class="interactive-demo">
        <h3>Mouse click testpad</h3>
        <p>Perform a <b>Left-click</b>, <b>Middle-click</b>, or <b>Right-click</b> inside the box below to test mouse modifiers.</p>

        <div
          class="click-area"
          onMouseDown={handleMouseDown}
          ref={(el) => {
            if (!el || (el as any).__contextBound) return;
            (el as any).__contextBound = true;
            // Listen to contextmenu and block browser defaults cleanly
            el.addEventListener('contextmenu', event.right.prevent.handler((e: Event) => {
              const mouseEvent = e as MouseEvent;
              const rect = el.getBoundingClientRect();
              contextMenu = {
                x: mouseEvent.clientX - rect.left,
                y: mouseEvent.clientY - rect.top,
                visible: true
              };
              showToast('Right Click menu blocked. Custom dropdown opened.');
            }));
          }}
        >
          <span>Click here with Left, Middle, or Right buttons</span>

          {contextMenu.visible && (
            <div
              class="custom-menu"
              style={{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }}
            >
              <div class="menu-item" onClick={() => showToast('Selected Option A')}>Option A</div>
              <div class="menu-item" onClick={() => showToast('Selected Option B')}>Option B</div>
              <div class="menu-item" onClick={() => { contextMenu.visible = false; }}>Dismiss Menu</div>
            </div>
          )}
        </div>
      </div>

      {/* Floating notifications */}
      <div class="toast-container">
        {toasts.map((toast) => (
          <div class="toast-card" key={toast.id}>
            <span class="toast-icon">⚡</span>
            <span class="toast-text">{toast.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
