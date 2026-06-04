import {} from 'auwla/jsx-runtime';

/**
 * Overview description of Event Modifiers in Auwla.
 */
export function ModifiersHome() {
  return () => (
    <div class="docs-section">
      <h1>Event Modifiers</h1>
      <p>Auwla includes fluent, chainable event modifiers directly on the <code>event</code> builder. They let you implement standard interaction behaviors (like blocking defaults, stopping propagation, key shortcut filtering, or debouncing/throttling) directly in your JSX bindings rather than polluting your event handler closures.</p>

      <h2>Key Features</h2>
      <ul>
        <li><b>Pure State Separation:</b> Decouples DOM events from state manipulation logic.</li>
        <li><b>Fluent Builder Pattern:</b> Modifiers can be combined sequentially (e.g. <code>event.prevent.stop.once.handler(...)</code>).</li>
        <li><b>Global Listeners & Hotkeys:</b> Easily register window-level event tracking (like click-outside detectors) and key sequences with automatic setup and cleanup lifecycles.</li>
      </ul>

      <p>Select a route from the sidebar to explore interactive live-testing scenarios!</p>
    </div>
  );
}
