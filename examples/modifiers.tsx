import { component, commit } from 'auwla';
import { event } from 'auwla/events';
import { Link, RouteComponent } from 'auwla/router';
import type {} from 'auwla/jsx-runtime';
import './styles/modifiers.css';

// ---------------------------------------------------------------------------
// Modifiers sub-routes definitions
// ---------------------------------------------------------------------------

export const modifiersRoutes = [
  { path: '/', component: ModifiersHome },
  { path: '/keyboard', component: KeyboardModifiersDemo },
  { path: '/mouse', component: MouseModifiersDemo },
];

// Layout shell
export function ModifiersShell(Child: RouteComponent) {
  return () => (
    <div class="modifiers-layout">
      <aside class="modifiers-sidebar">
        <h2>Modifiers</h2>
        <nav>
          <Link href="/modifiers" activeClass="" exactActiveClass="active">Overview</Link>
          <Link href="/modifiers/keyboard" activeClass="active" exactActiveClass="active">Keyboard</Link>
          <Link href="/modifiers/mouse" activeClass="active" exactActiveClass="active">Mouse</Link>
        </nav>
      </aside>
      <div class="modifiers-content">
        <Child />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Modifiers Overview page
// ---------------------------------------------------------------------------

function ModifiersHome() {
  return () => (
    <div class="docs-section">
      <h1>Event Modifiers</h1>
      <p>Auwla includes fluent, chainable event modifiers directly on the <code>event</code> builder. They let you implement standard interaction behaviors (like blocking defaults, stopping propagation, key shortcut filtering, or debouncing/throttling) directly in your JSX bindings rather than polluting your event handler closures.</p>

      <h2>Key Features</h2>
      <ul>
        <li><b>Pure State Separation:</b> Decouples DOM events from state manipulation logic.</li>
        <li><b>Fluent Builder Pattern:</b> Modifiers can be combined sequentially (e.g. <code>event.prevent.stop.once.handler(...)</code>).</li>
        <li><b>Polymorphic Compatibility:</b> Properties like <code>left</code> and <code>right</code> dynamically adapt between Mouse clicks and Keyboard arrow keys based on the event context.</li>
      </ul>

      <p>Select a route from the sidebar to explore interactive live-testing scenarios!</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Keyboard Modifiers interactive demo
// ---------------------------------------------------------------------------

function KeyboardModifiersDemo() {
  const self = component();
  let toasts: Array<{ id: string; text: string }> = [];
  let toastId = 0;

  // Generate grid cells
  let cells: {x:number,y:number,hasChar:boolean}[] = [];
  // Character movement grid game state:
  let characterPos = { x: 1, y: 1 }; // 0-indexed coordinates (0 to 3)

  for (let y = 0; y < 4; y++) {
    for (let x = 0; x < 4; x++) {
      const hasChar = characterPos.x === x && characterPos.y === y;
      cells.push({ x, y, hasChar });
    }
  }

  console.log(cells)

  function showToast(text: string) {
    const id = String(toastId++);
    toasts.push({ id, text });
    commit(self);
    setTimeout(() => {
      toasts = toasts.filter(t => t.id !== id);
      commit(self);
    }, 2200);
  }

  function move(dx: number, dy: number, dir: string) {
    const newX = Math.max(0, Math.min(3, characterPos.x + dx));
    const newY = Math.max(0, Math.min(3, characterPos.y + dy));
    if (newX !== characterPos.x || newY !== characterPos.y) {
      characterPos = { x: newX, y: newY };
      cells = cells.map(it => {
        if (it.x == newX && it.y == newY) return { ...it, hasChar: true }
        return {...it,hasChar:false}
      })
      showToast(`Character moved ${dir} to (${newX}, ${newY})`);
    } else {
      showToast(`Hit wall trying to go ${dir}`);
    }
  }

  // Combined key handler to respect TS types and run multiple modified handlers
  const handleKeyDown = (e: KeyboardEvent) => {
    event.left.prevent.handler(() => move(-1, 0, 'Left'))(e);
    event.right.prevent.handler(() => move(1, 0, 'Right'))(e);
    event.up.prevent.handler(() => move(0, -1, 'Up'))(e);
    event.down.prevent.handler(() => move(0, 1, 'Down'))(e);
    event.enter.handler(() => showToast('Pressed Enter!'))(e);
    event.esc.handler(() => showToast('Pressed Escape!'))(e);
    event.tab.prevent.handler(() => showToast('Tab default blocked!'))(e);
    event.space.prevent.handler(() => showToast('Spacebar default blocked!'))(e);
    event.del.handler(() => showToast('Delete key pressed!'))(e);
  };


  return () => (
      <div class="docs-section">
        <h1>Keyboard Modifiers</h1>
        <p>Interact with arrow keys, discrete keystrokes, and keyboard layout combinations seamlessly.</p>

        <div class="code-box">
{`const handleKeyDown = (e: KeyboardEvent) => {
  event.left.prevent.handler(() => move(-1, 0))(e);
  event.right.prevent.handler(() => move(1, 0))(e);
  event.up.prevent.handler(() => move(0, -1))(e);
  event.down.prevent.handler(() => move(0, 1))(e);
  event.enter.handler(() => submit())(e);
};`}
        </div>

        <div class="interactive-demo">
          <h3>Interactive Arrow Key Grid</h3>
          <p>Focus the input field below, then press your <b>Arrow keys</b>, <b>Enter</b>, <b>Escape</b>, <b>Delete</b>, <b>Spacebar</b>, or <b>Tab</b> keys to test modifiers.</p>

          <input
            class="input-box"
            placeholder="Click here to focus and test key combinations..."
            onKeyDown={handleKeyDown}
          />

          <div class="grid-game">
            {cells.map((cell) => (
              <div
                key={`${cell.x}-${cell.y}`}
                class={`grid-cell ${cell.hasChar ? 'active' : ''}`}
              >
                {cell.hasChar ? '😊' : ''}
              </div>
            ))}
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

// ---------------------------------------------------------------------------
// Mouse Modifiers interactive demo
// ---------------------------------------------------------------------------

function MouseModifiersDemo() {
  const self = component();
  let toasts: Array<{ id: string; text: string }> = [];
  let toastId = 0;

  // Custom context menu coordinates and visibility:
  let contextMenu: { x: number; y: number; visible: boolean } = { x: 0, y: 0, visible: false };

  function showToast(text: string) {
    const id = String(toastId++);
    toasts.push({ id, text });
    commit(self);
    setTimeout(() => {
      toasts = toasts.filter(t => t.id !== id);
      commit(self);
    }, 2200);
  }

  function closeMenu() {
    if (contextMenu.visible) {
      contextMenu.visible = false;
    }
  }

  // Combined mouse down handler to resolve TS types correctly
  const handleMouseDown = (e: MouseEvent) => {
    event.left.handler(() => showToast('Left Click (Primary) intercepted'))(e);
    event.middle.handler(() => showToast('Middle Click (Scroll Wheel) intercepted'))(e);
  };

  return () => (
    <div class="docs-section" onClick={closeMenu}>
      <h1>Mouse Modifiers</h1>
      <p>Inspect and filter mouse clicks directly at the event binding level.</p>

      <div class="code-box">
{`const handleMouseDown = (e: MouseEvent) => {
  event.left.handler(() => log('Left Click'))(e);
  event.middle.handler(() => log('Middle Click'))(e);
};`}
      </div>

      <div class="interactive-demo">
        <h3>Mouse click testpad</h3>
        <p>Perform a <b>Left-click</b>, <b>Middle-click</b>, or <b>Right-click</b> inside the box below to test mouse modifiers.</p>

        <div
          class="click-area"
          onMouseDown={handleMouseDown}
          ref={(el) => {
            if (!el) return;
            // Listen to standard contextmenu DOM event and block browser defaults cleanly
            el.addEventListener('contextmenu', event.right.prevent.handler((e: Event) => {
              const mouseEvent = e as MouseEvent;
              const rect = el.getBoundingClientRect();
              contextMenu = {
                x: mouseEvent.clientX - rect.left,
                y: mouseEvent.clientY - rect.top,
                visible: true
              };
              showToast('Right Click (Secondary) menu blocked. Custom dropdown opened.');
            }));
          }}
        >
          <span>Click here with Left, Middle, or Right buttons</span>

          {contextMenu.visible && (
            <div
              class="custom-menu"
              style={{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }}
            >
              <div class="menu-item" onClick={() => showToast('Selected option: Command A')}>Command A</div>
              <div class="menu-item" onClick={() => showToast('Selected option: Command B')}>Command B</div>
              <div class="menu-item" onClick={() => { contextMenu.visible = false}}>Dismiss Menu</div>
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
