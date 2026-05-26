import { createMemoApp, commit, component, cleanup } from 'auwla';
import type {} from 'auwla/jsx-runtime';

// ─── Shared State (Object + Getters pattern) ────────────────────────────────

const state = {
  count: 0,
  get doubled() { return this.count * 2; },
  get label()   { return `Count is ${this.count}`; },
};

// ─── Components ──────────────────────────────────────────────────────────────

/**
 * Counter — demonstrates local closure state with event-driven re-rendering.
 * No commit() needed here — click events auto-trigger re-renders.
 */
function Counter() {
  let localCount = 0;

  return () => (
    <div style={{ padding: '16px', border: '1px solid #444', borderRadius: '8px', marginBottom: '16px' }}>
      <h3>Local Counter (event-driven)</h3>
      <p>Local: {localCount}</p>
      <button onClick={() => { localCount++; }}>Increment Local</button>
    </div>
  );
}

/**
 * SharedDisplay — reads from shared state object.
 * Uses commit() to trigger re-render after external mutation.
 */
function SharedDisplay() {
  return () => (
    <div style={{ padding: '16px', border: '1px solid #444', borderRadius: '8px', marginBottom: '16px' }}>
      <h3>Shared State (commit pattern)</h3>
      <p>{state.label}</p>
      <p>Doubled: {state.doubled}</p>
      <button onClick={() => { state.count++; commit(); }}>
        Increment Shared
      </button>
    </div>
  );
}

/**
 * FetchUsers — async data fetching with component() + commit(self).
 * Demonstrates scoped re-rendering: only this component re-renders when data arrives.
 */
function FetchUsers() {
  const self = component();
  let users: { id: number; name: string; email: string }[] = [];
  let loading = true;
  let error = '';

  // Fetch fires in setup — runs once on mount
  fetch('https://jsonplaceholder.typicode.com/users?_limit=5')
    .then(res => res.json())
    .then(data => { users = data; })
    .catch(err => { error = err.message; })
    .finally(() => {
      loading = false;
      commit(self); // Only re-render this component
    });

  return () => (
    <div style={{ padding: '16px', border: '1px solid #444', borderRadius: '8px', marginBottom: '16px' }}>
      <h3>Async Fetch (scoped commit)</h3>
      {loading ? (
        <p style={{ color: '#ff9900' }}>Loading users...</p>
      ) : error ? (
        <p style={{ color: '#ff4444' }}>Error: {error}</p>
      ) : (
        <ul>
          {users.map(user => (
            <li key={user.id}>
              <strong>{user.name}</strong> — {user.email}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * LiveClock — demonstrates cleanup().
 * Registers an interval in setup, cleans it up when removed from the tree.
 */
function LiveClock() {
  const self = component();
  let time = new Date().toLocaleTimeString();

  // Start a timer — runs once in setup
  const timer = setInterval(() => {
    time = new Date().toLocaleTimeString();
    commit(self);
  }, 1000);

  // Register cleanup — fires when this component is removed or app is destroyed
  cleanup(() => {
    clearInterval(timer);
    console.log('[LiveClock] Interval cleared');
  });

  return () => (
    <div style={{ padding: '16px', border: '1px solid #0af', borderRadius: '8px', marginBottom: '16px' }}>
      <h3>Live Clock (with cleanup)</h3>
      <p style={{ fontSize: '24px', fontFamily: 'monospace' }}>{time}</p>
    </div>
  );
}

/**
 * App — demonstrates conditional rendering with cleanup.
 * Toggle the clock on/off to see cleanup fire in the console.
 */
function App() {
  let showClock = true;

  return () => (
    <div style={{ fontFamily: 'sans-serif', maxWidth: '700px', margin: '40px auto' }}>
      <h1>Auwla Patterns</h1>

      <Counter />
      <SharedDisplay />
      <FetchUsers />

      <div style={{ marginBottom: '16px' }}>
        <button onClick={() => { showClock = !showClock; }}>
          {showClock ? 'Hide Clock (triggers cleanup)' : 'Show Clock'}
        </button>
      </div>
      {showClock && <LiveClock />}

      <p style={{ color: '#888', fontSize: '12px', marginTop: '32px' }}>
        Open the console to see cleanup logs when toggling the clock.
      </p>
    </div>
  );
}

// ─── Mount ───────────────────────────────────────────────────────────────────

const root = document.getElementById('app');
if (root) {
  createMemoApp(root, <App />);
}
