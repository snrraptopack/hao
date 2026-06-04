import { component, commit } from 'auwla';
import { event } from 'auwla/events';
import type {} from 'auwla/jsx-runtime';

/**
 * Interactive Hotkeys dashboard example.
 * Demonstrates global key combinations and key sequences using event.hotkey(...).
 */
export function HotkeysDemo() {
  const self = component();
  let toasts: Array<{ id: string; text: string }> = [];
  let toastId = 0;

  // Track which shortcut card is currently active (flashing)
  let activeShortcut: string | null = null;
  let activeTimeout: any = null;

  function showToast(text: string) {
    const id = String(toastId++);
    toasts.push({ id, text });
    setTimeout(() => {
      toasts = toasts.filter(t => t.id !== id);
      commit(self); // commit only inside async setTimeout
    }, 2200);
  }

  function triggerShortcut(name: string, actionText: string) {
    if (activeTimeout) {
      clearTimeout(activeTimeout);
    }
    activeShortcut = name;
    showToast(actionText);

    activeTimeout = setTimeout(() => {
      activeShortcut = null;
      commit(self); // commit inside async setTimeout
    }, 500);
  }

  // -------------------------------------------------------------------------
  // Register all global hotkeys exactly ONCE during component setup
  // -------------------------------------------------------------------------
  
  // Ctrl+S / Cmd+S (Save combo)
  event.hotkey('ctrl+s').prevent.handler(() => {
    triggerShortcut('save', 'Document Saved! (Ctrl+S captured)');
  });

  // Ctrl+P (Print combo)
  event.hotkey('ctrl+p').prevent.handler(() => {
    triggerShortcut('print', 'Initiated Print job! (Ctrl+P captured)');
  });

  // Escape (Dismiss/Clear)
  event.hotkey('esc').handler(() => {
    triggerShortcut('clear', 'Cleared dashboard notifications! (Escape captured)');
    toasts = [];
  });

  // Sequence 'g i' (Go to Inbox)
  event.hotkey('g i').handler(() => {
    triggerShortcut('inbox', 'Navigating to Inbox... (Key sequence "g i" complete)');
  });

  // Sequence 'g a' (Go to Archive)
  event.hotkey('g a').handler(() => {
    triggerShortcut('archive', 'Archiving items... (Key sequence "g a" complete)');
  });

  const shortcutsList = [
    { key: 'save', combo: 'Ctrl + S / Cmd + S', action: 'Save page state', text: 'Document Saved!' },
    { key: 'print', combo: 'Ctrl + P', action: 'Simulate document printing', text: 'Initiating printing...' },
    { key: 'clear', combo: 'Esc / Escape', action: 'Clear toasts and resets dashboard', text: 'Resets notification list' },
    { key: 'inbox', combo: 'g i (Sequence)', action: 'Gmail-style navigation sequence to Inbox', text: 'Navigate to Inbox' },
    { key: 'archive', combo: 'g a (Sequence)', action: 'Gmail-style sequence to Archive', text: 'Archive items' },
  ];

  return () => (
    <div class="docs-section">
      <h1>Global Hotkeys & Sequences</h1>
      <p>Register document-level keyboard shortcuts and multi-key sequences natively. Integrates with existing modifiers like <code>.prevent</code> and respects input fields automatically.</p>

      <div class="interactive-demo">
        <h3>Interactive Hotkey Registry</h3>
        <p>Press any of the following shortcuts anywhere on the page to trigger them. The active shortcut card will flash green.</p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px', marginTop: '16px' }}>
          {shortcutsList.map((item) => (
            <div 
              key={item.key}
              class="click-area"
              style={{
                cursor: 'default',
                borderColor: activeShortcut === item.key ? 'var(--color-accent-green)' : 'var(--color-border)',
                backgroundColor: activeShortcut === item.key ? 'var(--color-accent-green-soft)' : '#fff',
                transition: 'all 0.15s ease',
                padding: '16px',
                margin: 0,
                borderStyle: 'solid'
              }}
            >
              <div style={{ fontWeight: 'bold', fontSize: '0.85rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {item.combo}
              </div>
              <h4 style={{ margin: '4px 0 8px 0', color: '#1f2937' }}>{item.action}</h4>
              <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{item.text}</span>
            </div>
          ))}
        </div>
      </div>

      <div class="interactive-demo" style={{ marginTop: '24px' }}>
        <h3>Smart Input Field Filtering</h3>
        <p>Auwla filters out hotkeys inside text inputs by default so typing works normally. Focus the text field below and type <b>"g i"</b> or press <b>"Escape"</b>. Nothing will fire. Then, press <b>"Ctrl+S"</b> inside the text field — the shortcut will trigger correctly because it includes modifiers!</p>

        <input 
          class="input-box" 
          placeholder="Type 'g i' or press 'Escape' here..."
          style={{ width: '100%', maxWidth: '400px' }}
        />
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
