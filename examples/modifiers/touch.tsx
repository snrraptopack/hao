import { component, commit } from 'auwla';
import { event } from 'auwla/events';
import { css,} from "auwla/css"


let colors = css.color.palette('oklch(0.72 0.16 195)')
let colorIndex = Object.keys(colors)



/**
 * Interactive Touch and Advanced Modifiers demo.
 * Showcases pointer gestures (sync, fit, moved) and advanced modifiers (silent, outside, closest, trap).
 */
export function TouchModifiersDemo() {
  const self = component();

  // Toast notification state
  let toasts: Array<{ id: string; text: string }> = [];
  let toastId = 0;

  function showToast(text: string) {
    const id = String(toastId++);
    toasts.push({ id, text });
    commit(self);
    setTimeout(() => {
      toasts = toasts.filter(t => t.id !== id);
      commit(self);
    }, 2200);
  }

  // 1. Dragging state (for touch.sync & touch.fit)
  let boxPosition = { x: 50, y: 50 }; // fit percentage coordinates
  let rawPosition = { x: 100, y: 100 }; // pixel sync coordinates

  // 2. Swipe detection (for touch.moved)
  let swipeDirection = 'None';
  let swipeCount = 0;
  let isMoving = false

  // 3. Silent & render counts (for silent modifier demo)
  let renderCount = 0;
  let moveCount = 0;

  // 4. Outside modifier (dropdown state)
  let dropdownOpen = false;

  renderCount++;

  return () => (
    <div class="docs-section">
      {colorIndex.map(it => (
        <button style={css({
          background: colors[it],
          padding: css.rem(0.95),
          marginLeft: css.px(5)
        })}>{it}</button>
      ))}

      <h1>Touch Gestures & Advanced Modifiers</h1>
      <p>
        Explore Auwla's custom touch gesture tracking system alongside high-demand event listeners.
      </p>

      {/* 1. Touch Gesture Section */}
      <div class="interactive-demo">
        <h3>Pointer Gesture System</h3>
        <p>
          Drag the card below. The coordinates are synchronized using <code>event.touch.sync</code> and
          constrained relative to the box layout using <code>event.touch.fit</code>.
        </p>

        <div
          class="drag-container"
          style={{
            position: 'relative',
            height: '250px',
            background: '#f1f5f9',
            borderRadius: '8px',
            border: '1px solid var(--color-border)',
            overflow: 'hidden',
            marginBottom: '20px'
          }}
        >
          {/* Card synced with offset */}
          <div
            style={css({
              position: 'absolute',
              left: css.px(rawPosition.x),
              top: css.px(rawPosition.y),
              height: '80px',
              background: 'linear-gradient(135deg, var(--color-accent), #4f46e5)',
              color: '#ffffff',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.8rem',
              fontWeight: 'bold',
              cursor: 'grab',
              userSelect: 'none',
              boxShadow: '0 4px 12px rgba(31, 111, 235, 0.3)',
              width: css.when(isMoving,{true:css.px(100),false:css.px(80)})
            })}
            onTouch={event.touch.sync(rawPosition, 'x', 'y').handler(() => {
              isMoving = true
            })}
            onTouchEnd={() => {
              isMoving = false
              console.log("end")
            }}
          >
            sync
          </div>

          <div
            style={{
              position: 'absolute',
              right: '12px',
              bottom: '12px',
              fontSize: '0.8rem',
              color: 'var(--color-text-muted)',
              fontFamily: 'monospace'
            }}
          >
            Raw Position: X: {Math.round(rawPosition.x)}px, Y: {Math.round(rawPosition.y)}px
          </div>
        </div>

        <h4>Linear Interpolation (.fit)</h4>
        <p>
          Drag the circle below. Its local position (0 to 1 relative to the container width) is linearly interpolated
          into a custom range (0 to 100) using <code>event.touch.fit(0, 100)</code>.
        </p>
        <div
          class="fit-container"
          style={{
            position: 'relative',
            height: '60px',
            background: '#e2e8f0',
            borderRadius: '30px',
            border: '1px solid var(--color-border)',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            padding: '0 30px'
          }}
          onTouch={event.touch.fit(0, 100).handler((e: any) => {
            boxPosition.x = e.detail.x;
          })}
        >
          <div
            style={{
              position: 'absolute',
              left: `calc(${boxPosition.x}% - 20px)`,
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: 'var(--color-accent-green)',
              cursor: 'ew-resize',
              boxShadow: '0 2px 6px rgba(45, 164, 78, 0.3)'
            }}
          />
          <span style={{ margin: 'auto', fontSize: '0.9rem', fontWeight: 'bold', zIndex: 1, pointerEvents: 'none', color: '#1e293b' }}>
            Interpolated value: {Math.round(boxPosition.x)}
          </span>
        </div>
      </div>

      {/* 2. Swipe Gestures Section */}
      <div class="interactive-demo">
        <h3>Threshold Swipe Filtering (.moved)</h3>
        <p>
          Swipe left or right inside the swipepad below. Gestures are filtered via <code>event.touch.moved(40, 'left')</code>
          and <code>event.touch.moved(40, 'right')</code> to prevent small movements from triggering swipes.
        </p>

        <div
          class="swipe-pad"
          style={{
            height: '100px',
            background: '#f8fafc',
            border: '2px dashed var(--color-border)',
            borderRadius: '8px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            userSelect: 'none'
          }}
          onTouch={
            event.touch.moved(40, 'left').handler(() => {
            swipeDirection = 'Left';
            swipeCount++;
            showToast('Swiped Left ◀');}).touch.moved(40, 'right').handler(() => {
            swipeDirection = 'Right';
            swipeCount++;
            showToast('Swiped Right ▶');
          })}
        >
          <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--color-text-main)' }}>
            Swipe Left or Right
          </span>
          <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
            Last direction: {swipeDirection} | Total Swipes: {swipeCount}
          </span>
        </div>
      </div>

      {/* 3. High/Medium Demand Modifiers Section */}
      <div class="interactive-demo">
        <h3>High / Medium Demand Modifiers</h3>
        <p>
          Test standard event helper utilities built directly into Auwla's compiler.
        </p>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginTop: '16px' }}>

          {/* A. Outside Modifier */}
          <div style={{ flex: '1 1 200px', position: 'relative' }}>
            <h4>Clicks Outside (.outside)</h4>
            <button
              class="input-box"
              style={{ background: 'var(--color-accent-soft)', color: 'var(--color-accent)', fontWeight: 'bold' }}
              onClick={(e) => {
                e.stopPropagation();
                dropdownOpen = !dropdownOpen;
              }}
            >
              Toggle Dropdown
            </button>

            {dropdownOpen && (
              <div
                class="custom-menu"
                style={{ top: '80px', left: '0', display: 'block' }}
                onClick={event.outside.handler(() => {
                  dropdownOpen = false;
                  showToast('Menu closed due to click outside!');
                })}
              >
                <div class="menu-item" onClick={() => showToast('Clicked Item 1')}>Item 1</div>
                <div class="menu-item" onClick={() => showToast('Clicked Item 2')}>Item 2</div>
                <div class="menu-item" style={{ color: 'red' }}>Click outside to dismiss</div>
              </div>
            )}
          </div>

          {/* B. Silent Modifier */}
          <div style={{ flex: '1 1 200px' }}>
            <h4>Silent Listeners (.silent)</h4>
            <div
              style={{
                background: '#fafafa',
                border: '1px solid var(--color-border)',
                padding: '12px',
                borderRadius: '6px',
                textAlign: 'center',
                cursor: 'pointer'
              }}
              onMouseMove={event.silent.handler(() => {
                moveCount++;
                const el = document.getElementById('silent-move-counter');
                if (el) el.innerText = String(moveCount);
              })}
            >
              <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Hover here (no re-renders)</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 'bold', margin: '6px 0' }}>
                Moves: <span id="silent-move-counter">{moveCount}</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-accent)' }}>
                Render Count: {renderCount}
              </div>
            </div>
          </div>

          {/* C. Closest Selector (.closest) */}
          <div style={{ flex: '1 1 200px' }}>
            <h4>Ancestor Target (.closest)</h4>
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid var(--color-border)',
                padding: '12px',
                borderRadius: '6px',
                display: 'flex',
                justifyContent: 'center'
              }}
              onClick={event.closest('.action-btn').handler((e: any) => {
                const target = e.target.closest('.action-btn');
                showToast(`Target caught: ${target.innerText}`);
              })}
            >
              <button class="action-btn" style={{ padding: '6px 12px', borderRadius: '4px', background: '#3b82f6', color: '#fff', border: 'none', cursor: 'pointer' }}>
                <span style={{ pointerEvents: 'none' }}>Nested Span inside Button</span>
              </button>
            </div>
          </div>

          {/* D. Event Trapping (.trap) */}
          <div style={{ flex: '1 1 200px' }}>
            <h4>Stop & Prevent (.trap)</h4>
            <div
              style={{
                background: '#fee2e2',
                border: '1px solid #fca5a5',
                padding: '12px',
                borderRadius: '6px',
                textAlign: 'center',
                cursor: 'pointer'
              }}
              onClick={() => showToast('Parent element clicked!')}
            >
              <button
                style={{ padding: '6px 12px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                onClick={event.trap.handler(() => {
                  showToast('Child button clicked with .trap (propagation blocked!)');
                })}
              >
                Trapped Action
              </button>
            </div>
          </div>

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
