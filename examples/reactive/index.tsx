import { togglePlain, toggleReactive } from './store';
import { Display, SiblingDisplay } from './display';

export function ReactiveDemo() {
  console.log('ReactiveDemo component setup run (only once)');

  return () => {
    console.log('ReactiveDemo component rendered');
    return (
      <div style={{ fontFamily: 'sans-serif', maxWidth: '600px', margin: '40px auto' }}>
        <h2>Reactive vs Plain Variable Demo</h2>
        
        <p style={{ color: '#666' }}>
          Click the buttons to trigger updates directly:
        </p>
        
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={togglePlain}
            style={{
              padding: '10px 20px',
              fontSize: '16px',
              backgroundColor: '#dc3545',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Toggle Plain Theme
          </button>

          <button
            onClick={toggleReactive}
            style={{
              padding: '10px 20px',
              fontSize: '16px',
              backgroundColor: '#28a745',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Toggle Reactive Theme
          </button>
        </div>

        <Display />
        <SiblingDisplay />
        
        <div style={{ marginTop: '20px', fontSize: '14px', color: '#555' }}>
          <h5>What to observe:</h5>
          <ul>
            <li>Open the browser's developer console.</li>
            <li>Click <strong>Toggle Plain Theme</strong>. The variable updates in the store, but notice in the console that <strong>neither</strong> Display nor SiblingDisplay components re-render (their render logs do not print). Therefore, the plain value on screen stays red <code>light</code>.</li>
            <li>Click <strong>Toggle Reactive Theme</strong>. The console shows both Display and SiblingDisplay re-render, and their values update immediately on the screen.</li>
          </ul>
        </div>
      </div>
    );
  };
}
