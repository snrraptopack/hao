import { component, commit } from 'auwla';
import { event } from 'auwla/events';
import type {} from 'auwla/jsx-runtime';

/**
 * Interactive Keyboard Grid game demo.
 * Demonstrates local keyboard event filters on focused input element.
 */
export function KeyboardModifiersDemo() {
  const self = component();
  let toasts: Array<{ id: string; text: string }> = [];
  let toastId = 0;

  // Character movement grid game state:
  let characterPos = { x: 1, y: 1 }; // 0-indexed coordinates (0 to 3)

  // Generate grid cells once in setup
  let cells: { x: number; y: number; hasChar: boolean }[] = [];
  for (let y = 0; y < 4; y++) {
    for (let x = 0; x < 4; x++) {
      const hasChar = characterPos.x === x && characterPos.y === y;
      cells.push({ x, y, hasChar });
    }
  }

  function showToast(text: string) {
    const id = String(toastId++);
    toasts.push({ id, text });
    setTimeout(() => {
      toasts = toasts.filter(t => t.id !== id);
      commit(self); // commit only inside async setTimeout
    }, 2200);
  }

  function move(dx: number, dy: number, dir: string) {
    const newX = Math.max(0, Math.min(3, characterPos.x + dx));
    const newY = Math.max(0, Math.min(3, characterPos.y + dy));
    if (newX !== characterPos.x || newY !== characterPos.y) {
      characterPos = { x: newX, y: newY };
      cells = cells.map(it => {
        if (it.x == newX && it.y == newY) return { ...it, hasChar: true };
        return { ...it, hasChar: false };
      });
      showToast(`Character moved ${dir} to (${newX}, ${newY})`);
    } else {
      showToast(`Hit wall trying to go ${dir}`);
    }
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    event.left.prevent.handler(() => move(-1, 0, 'Left'))(e);
    event.right.prevent.handler(() => move(1, 0, 'Right'))(e);
    event.up.prevent.handler(() => move(0, -1, 'Up'))(e);
    event.down.prevent.handler(() => move(0, 1, 'Down'))(e);
  };

  return () => (
    <div class="docs-section">
      <h1>Keyboard Modifiers</h1>
      <p>Interact with arrow keys, discrete keystrokes, and keyboard layout combinations seamlessly.</p>

      <div class="interactive-demo">
        <h3>Interactive Arrow Key Grid</h3>
        <p>Focus the input field below, then press your <b>Arrow keys</b> to move the character around the grid.</p>

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
