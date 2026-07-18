import { describe, it, expect } from 'vitest';
import { compileAuwla } from '../../src/compiler';

describe('automatic commit wrappers', () => {
  it('automatically wraps async function declarations that mutate local state', () => {
    const source = `
      function App() {
        const self = component();
        let data = null;

        async function loadData() {
          const res = await api.get();
          data = res.data;
        }

        return () => <div>{data}</div>;
      }
      exports.App = App;
    `;

    const compiled = compileAuwla(source);
    expect(compiled).toContain('try {');
    expect(compiled).toContain('data = res.data;');
    expect(compiled).toContain('} finally {\n    __commit(self);\n  }');
  });

  it('automatically wraps setTimeout arrow callbacks that mutate state', () => {
    const source = `
      function App() {
        const self = component();
        let count = 0;

        setTimeout(() => {
          count++;
        }, 1000);

        return () => <div>{count}</div>;
      }
      exports.App = App;
    `;

    const compiled = compileAuwla(source);
    expect(compiled).toContain('try {');
    expect(compiled).toContain('count++;');
    expect(compiled).toContain('} finally {\n    __commit(self);\n  }');
  });

  it('ignores functions that already call commit(self) manually', () => {
    const source = `
      function App() {
        const self = component();
        let count = 0;

        async function update() {
          count++;
          commit(self);
        }

        return () => <div>{count}</div>;
      }
      exports.App = App;
    `;

    const compiled = compileAuwla(source);
    // Should not contain a duplicate try/finally block for commit
    const tryCount = (compiled.match(/finally/g) || []).length;
    expect(tryCount).toBe(0);
  });

  it('ignores functions that do not mutate local state', () => {
    const source = `
      function App() {
        const self = component();
        let count = 0;

        async function logData() {
          console.log("no mutations");
        }

        return () => <div>{count}</div>;
      }
      exports.App = App;
    `;

    const compiled = compileAuwla(source);
    expect(compiled).not.toContain('finally {\n    __commit(self);\n  }');
  });

  it('automatically wraps nested callbacks inside helper functions but skips synchronous parent helper', () => {
    const source = `
      function App() {
        const self = component();
        let status = 'idle';

        function update() {
          status = 'started';
          setTimeout(() => {
            status = 'completed';
          }, 1000);
        }

        return () => <div>{status}</div>;
      }
      exports.App = App;
    `;

    const compiled = compileAuwla(source);
    const tryCount = (compiled.match(/try \{/g) || []).length;
    const commitCount = (compiled.match(/__commit\(self\)/g) || []).length;
    // update is a synchronous helper, so only the setTimeout callback gets wrapped.
    expect(tryCount).toBe(1);
    expect(commitCount).toBe(1);
  });

  it('automatically wraps await expressions inside async helper functions', () => {
    const source = `
      function App() {
        const self = component();
        let data = null;

        async function load() {
          await new Promise(r => setTimeout(r, 10));
          data = 'loaded';
        }

        return () => <div>{data}</div>;
      }
      exports.App = App;
    `;

    const compiled = compileAuwla(source);
    expect(compiled).toContain('(__commit(self), await new Promise(');
  });

  it('does not wrap functions used directly as JSX event handlers', () => {
    const source = `
      function App() {
        const self = component();
        let count = 0;

        function increment() {
          count++;
        }

        return () => <button onClick={increment}>{count}</button>;
      }
      exports.App = App;
    `;

    const compiled = compileAuwla(source);
    expect(compiled).not.toContain('__commit(self)');
  });

  it('does not wrap helpers invoked by a JSX event callback', () => {
    const source = `
      function App() {
        const self = component();
        let count = 0;

        function increment() {
          count++;
        }

        return () => <button onClick={() => increment()}>{count}</button>;
      }
      exports.App = App;
    `;

    const compiled = compileAuwla(source);
    expect(compiled).not.toContain('__commit(self)');
  });

  it('does not wrap arrow-function event handlers used in JSX', () => {
    const source = `
      function App() {
        const self = component();
        let count = 0;

        const handleIncrement = () => {
          count++;
        };

        return () => <button onClick={handleIncrement}>{count}</button>;
      }
      exports.App = App;
    `;

    const compiled = compileAuwla(source);
    expect(compiled).not.toContain('__commit(self)');
  });

  it('does not wrap plain synchronous helper functions', () => {
    const source = `
      function App() {
        const self = component();
        let activityLogs = [];

        const logActivity = (msg) => {
          activityLogs = [msg, ...activityLogs];
        };

        return () => <div>{activityLogs.length}</div>;
      }
      exports.App = App;
    `;

    const compiled = compileAuwla(source);
    expect(compiled).not.toContain('__commit(self)');
  });

  it('does not wrap plain synchronous custom callbacks/options', () => {
    const source = `
      function App() {
        const self = component();
        let wsStatus = 'DISCONNECTED';

        const _ws = new WebSocket({
          onStatusChange: (status) => {
            wsStatus = status;
          }
        });

        return () => <div>{wsStatus}</div>;
      }
      exports.App = App;
    `;

    const compiled = compileAuwla(source);
    expect(compiled).not.toContain('__commit(self)');
  });
});

describe('external emitter auto-commit (out-of-event callbacks)', () => {
  it('wraps addEventListener callbacks that mutate state', () => {
    const source = `
      function App() {
        let count = 0;

        ws.addEventListener('message', (event) => {
          count++;
        });

        return () => <div>{count}</div>;
      }
      exports.App = App;
    `;

    const compiled = compileAuwla(source);
    expect(compiled).toContain('try {');
    expect(compiled).toContain('count++;');
    expect(compiled).toContain('} finally {\n    __commit(');
  });

  it('wraps EventEmitter-style .on callbacks that mutate state', () => {
    const source = `
      function App() {
        let items = [];

        emitter.on('change', (next) => {
          items = next;
        });

        return () => <div>{items.length}</div>;
      }
      exports.App = App;
    `;

    const compiled = compileAuwla(source);
    expect(compiled).toContain('try {');
    expect(compiled).toContain('items = next;');
    expect(compiled).toContain('} finally {\n    __commit(');
  });

  it('wraps store.subscribe callbacks that mutate state', () => {
    const source = `
      function App() {
        let theme = 'dark';

        store.subscribe(() => {
          theme = store.getState().theme;
        });

        return () => <div>{theme}</div>;
      }
      exports.App = App;
    `;

    const compiled = compileAuwla(source);
    expect(compiled).toContain('try {');
    expect(compiled).toContain('theme = store.getState().theme;');
    expect(compiled).toContain('} finally {\n    __commit(');
  });

  it('wraps property-assigned handlers (ws.onmessage = fn)', () => {
    const source = `
      function App() {
        let messages = 0;

        ws.onmessage = (event) => {
          messages++;
        };

        return () => <div>{messages}</div>;
      }
      exports.App = App;
    `;

    const compiled = compileAuwla(source);
    expect(compiled).toContain('try {');
    expect(compiled).toContain('messages++;');
    expect(compiled).toContain('} finally {\n    __commit(');
  });

  it('wraps observer-constructor callbacks (new MutationObserver)', () => {
    const source = `
      function App() {
        let mutations = 0;

        const observer = new MutationObserver(() => {
          mutations++;
        });

        return () => <div>{mutations}</div>;
      }
      exports.App = App;
    `;

    const compiled = compileAuwla(source);
    expect(compiled).toContain('try {');
    expect(compiled).toContain('mutations++;');
    expect(compiled).toContain('} finally {\n    __commit(');
  });

  it('does NOT wrap external callbacks that do not mutate state', () => {
    const source = `
      function App() {
        let count = 0;

        ws.addEventListener('message', (event) => {
          console.log(event.data);
        });

        return () => <div>{count}</div>;
      }
      exports.App = App;
    `;

    const compiled = compileAuwla(source);
    expect(compiled).not.toContain('} finally {\n    __commit(');
  });
});
