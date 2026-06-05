import { component } from 'auwla';
import { event } from 'auwla/events';
import { css, } from 'auwla/css';
import type { } from 'auwla/jsx-runtime';

// const style = css({
//   maxWidth: css.px(400),
//   cursor: "default",
//   backgroundColor: css.color('#f8fafc'),
//   padding: css.px(24),
//   border: css.border({style:"solid"})
// })

/**
 * Interactive Global Listeners demo.
 * Demonstrates window-level click-outside detection and mouse tracking
 * using event.click.global and event.mouseMove.global.
 */
export function GlobalModifiersDemo() {
  const self = component();
  let clickOutsideCount = 0;
  let trackMouse = false;
  let mouseCoords = { x: 0, y: 0 };
  let panelEl: HTMLElement | null = null;

  // Global click outside handler
  const handleGlobalClick = (e: MouseEvent) => {
    if (panelEl && !panelEl.contains(e.target as Node)) {
      clickOutsideCount++;
    }
  };

  // Global mouse coordinates handler
  const handleGlobalMouseMove = (e: MouseEvent) => {
    if (!trackMouse) return;
    mouseCoords = { x: e.clientX, y: e.clientY };
  };

  // Register exactly ONCE during component setup
  event.click.global.handler(handleGlobalClick);
  event.mouseMove.global.handler(handleGlobalMouseMove);

  return () => (
    <div class="docs-section">
      <h1>Global Event Listeners</h1>
      <p>Register events globally on the window/document level. Auwla automatically cleans up the event listeners when the active component unmounts or when conditional render blocks change.</p>

      <div class="interactive-demo">
        <h3>1. Click-Outside Panel</h3>
        <p>Click anywhere <b>inside</b> the card below to see normal behavior, or click <b>outside</b> the card anywhere on the page to trigger the global click detector.</p>

        <div
          class="click-area"
          style={{ maxWidth: '400px', cursor: 'default', backgroundColor: '#f8fafc', padding: '24px', borderStyle: 'solid' }}
          ref={(el) => { panelEl = el; }}
        >
          <h4 style={{ margin: '0 0 8px 0', color: '#1f2937' }}>Inside Test Pad</h4>
          <p style={{ margin: '0 0 12px 0', fontSize: '0.85rem' }}>Clicks inside this card are ignored by the outside detector.</p>
          <div class="stat-badge" style={{ backgroundColor: 'var(--color-accent-soft)', color: 'var(--color-accent)', fontWeight: 'bold' }}>
            Clicks Outside Panel: {clickOutsideCount}
          </div>
        </div>
      </div>

      <div class="interactive-demo" style={{ marginTop: '24px' }}>
        <h3>2. Global Mouse Tracking</h3>
        <p>Toggle the switch below to bind a global <b>mousemove</b> event listener that tracks your cursor coordinates anywhere on the window.</p>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <button
            class="input-box"
            style={{ width: 'auto', padding: '8px 16px', cursor: 'pointer', margin: 0, backgroundColor: trackMouse ? 'var(--color-accent)' : '#fff', color: trackMouse ? '#fff' : '#1f2937', border: '1px solid var(--color-border)' }}
            onClick={() => {
              trackMouse = !trackMouse;
            }}
          >
            {trackMouse ? '🟢 Tracking Coordinates' : '🔴 Tracking Disabled'}
          </button>
          {trackMouse && (
            <div class="stat-badge" style={{ margin: 0, backgroundColor: 'var(--color-accent-green-soft)', color: 'var(--color-accent-green)', fontWeight: 'bold' }}>
              X: {mouseCoords.x}px | Y: {mouseCoords.y}px
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
