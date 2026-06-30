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

  it('automatically wraps nested callbacks inside helper functions', () => {
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
    expect(tryCount).toBe(2);
    expect(commitCount).toBe(2);
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
});
