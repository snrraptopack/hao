import { describe, expect, test } from 'vitest';
import { compileAuwla, evaluateCompiled, createMemoApp, h } from './_helpers';

describe('conditional map compilation', () => {
  test('compiles && with map to activeBranch + keyedMap', () => {
    const source = `
      function App() {
        let show = false;
        let items = ['a', 'b'];
        exports.toggle = () => { show = !show; };
        exports.updateItems = () => { items = ['c', 'd', 'e']; };
        return () => <div>{show && items.map((item) => <span key={item}>{item}</span>)}</div>;
      }
      exports.App = App;
    `;

    const compiled = compileAuwla(source);
    expect(compiled).toContain('__keyedMap');
    expect(compiled).toContain('activeBranch');
    expect(compiled).not.toMatch(/__setChild.*loading\s*\|\|/) ;
    expect(compiled).not.toMatch(/__setChild.*items\.map/);

    const evaluated = evaluateCompiled(compiled) as {
      App: () => unknown;
      toggle(): void;
      updateItems(): void;
    };

    const root = document.createElement('div');
    const app = createMemoApp(root, h(evaluated.App as any));

    expect(root.querySelectorAll('span').length).toBe(0);

    evaluated.toggle();
    app.render();
    const spans1 = Array.from(root.querySelectorAll('span'));
    expect(spans1.length).toBe(2);
    expect(spans1.map((s) => s.textContent)).toEqual(['a', 'b']);

    evaluated.updateItems();
    app.render();
    const spans2 = Array.from(root.querySelectorAll('span'));
    expect(spans2.length).toBe(3);
    expect(spans2.map((s) => s.textContent)).toEqual(['c', 'd', 'e']);

    // First span should be reused because key 'a' is gone, but let's just verify it works
    evaluated.toggle();
    app.render();
    expect(root.querySelectorAll('span').length).toBe(0);

    evaluated.toggle();
    app.render();
    const spans3 = Array.from(root.querySelectorAll('span'));
    expect(spans3.length).toBe(3);
    expect(spans3.map((s) => s.textContent)).toEqual(['c', 'd', 'e']);
  });

  test('compiles ternary map : null', () => {
    const source = `
      function App() {
        let show = false;
        let items = ['a'];
        exports.toggle = () => { show = !show; };
        return () => <div>{show ? items.map((item) => <span key={item}>{item}</span>) : null}</div>;
      }
      exports.App = App;
    `;

    const compiled = compileAuwla(source);
    expect(compiled).toContain('__keyedMap');
    expect(compiled).toContain('activeBranch');

    const evaluated = evaluateCompiled(compiled) as {
      App: () => unknown;
      toggle(): void;
    };

    const root = document.createElement('div');
    const app = createMemoApp(root, h(evaluated.App as any));

    expect(root.querySelectorAll('span').length).toBe(0);

    evaluated.toggle();
    app.render();
    expect(root.querySelectorAll('span').length).toBe(1);
    expect(root.querySelector('span')!.textContent).toBe('a');
  });

  test('compiles ternary with map on both sides', () => {
    const source = `
      function App() {
        let show = false;
        let itemsA = ['a'];
        let itemsB = ['b'];
        exports.toggle = () => { show = !show; };
        return () => <div>{show ? itemsA.map((item) => <span key={item}>{item}</span>) : itemsB.map((item) => <span key={item}>{item}</span>)}</div>;
      }
      exports.App = App;
    `;

    const compiled = compileAuwla(source);
    expect(compiled).toContain('__keyedMap');
    const keyedMapMatches = compiled.match(/__keyedMap/g);
    expect(keyedMapMatches?.length).toBeGreaterThanOrEqual(2);

    const evaluated = evaluateCompiled(compiled) as {
      App: () => unknown;
      toggle(): void;
    };

    const root = document.createElement('div');
    const app = createMemoApp(root, h(evaluated.App as any));

    expect(root.querySelector('span')!.textContent).toBe('b');

    evaluated.toggle();
    app.render();
    expect(root.querySelector('span')!.textContent).toBe('a');

    evaluated.toggle();
    app.render();
    expect(root.querySelector('span')!.textContent).toBe('b');
  });

  test('compiles parenthesized map call as direct child', () => {
    const source = `
      function App() {
        let items = ['a'];
        return () => <div>{(items.map((item) => <span key={item}>{item}</span>))}</div>;
      }
      exports.App = App;
    `;

    const compiled = compileAuwla(source);
    expect(compiled).toContain('__keyedMap');
    expect(compiled).not.toMatch(/__setChild.*items\.map/);

    const { App } = evaluateCompiled(compiled) as { App: () => unknown };
    const root = document.createElement('div');
    createMemoApp(root, h(App as any));

    expect(root.querySelector('span')!.textContent).toBe('a');
  });

  test('compiles parenthesized map inside conditional', () => {
    const source = `
      function App() {
        let show = false;
        let items = ['a'];
        exports.toggle = () => { show = !show; };
        return () => <div>{show && (items.map((item) => <span key={item}>{item}</span>))}</div>;
      }
      exports.App = App;
    `;

    const compiled = compileAuwla(source);
    expect(compiled).toContain('__keyedMap');
    expect(compiled).toContain('activeBranch');

    const evaluated = evaluateCompiled(compiled) as {
      App: () => unknown;
      toggle(): void;
    };

    const root = document.createElement('div');
    const app = createMemoApp(root, h(evaluated.App as any));

    expect(root.querySelectorAll('span').length).toBe(0);

    evaluated.toggle();
    app.render();
    expect(root.querySelectorAll('span').length).toBe(1);
  });

  test('compiles nested ternary with map in middle branch', () => {
    const source = `
      function App() {
        let phase = 'loading';
        let items = ['a'];
        exports.setPhase = (p: string) => { phase = p; };
        return () => <div>{
          phase === 'loading' ? <p>Loading</p> :
          phase === 'list' ? items.map((item) => <span key={item}>{item}</span>) :
          <p>Empty</p>
        }</div>;
      }
      exports.App = App;
    `;

    const compiled = compileAuwla(source);
    expect(compiled).toContain('__keyedMap');
    expect(compiled).toContain('activeBranch');

    const evaluated = evaluateCompiled(compiled) as {
      App: () => unknown;
      setPhase(p: string): void;
    };

    const root = document.createElement('div');
    const app = createMemoApp(root, h(evaluated.App as any));

    expect(root.querySelector('p')!.textContent).toBe('Loading');

    evaluated.setPhase('list');
    app.render();
    expect(root.querySelector('span')!.textContent).toBe('a');

    evaluated.setPhase('empty');
    app.render();
    expect(root.querySelector('p')!.textContent).toBe('Empty');
  });
});


// ── NEW TESTS ──

describe('|| conditional compilation', () => {
  test('compiles || with boolean-like LHS to activeBranch', () => {
    const source = `
      function App() {
        let loading = true;
        exports.toggle = () => { loading = !loading; };
        return () => <div>{loading || <span>done</span>}</div>;
      }
      exports.App = App;
    `;

    const compiled = compileAuwla(source);
    expect(compiled).toContain('activeBranch');
    expect(compiled).not.toMatch(/__setChild.*loading\s*\|\|/) ;

    const evaluated = evaluateCompiled(compiled) as {
      App: () => unknown;
      toggle(): void;
    };

    const root = document.createElement('div');
    const app = createMemoApp(root, h(evaluated.App as any));

    // loading === true, so left side is truthy → empty branch (no span)
    expect(root.querySelectorAll('span').length).toBe(0);

    evaluated.toggle();
    app.render();
    expect(root.querySelector('span')!.textContent).toBe('done');
  });

  test('compiles || with comparison LHS to activeBranch', () => {
    const source = `
      function App() {
        let count = 0;
        exports.setCount = (n: number) => { count = n; };
        return () => <div>{count > 0 || <span>empty</span>}</div>;
      }
      exports.App = App;
    `;

    const compiled = compileAuwla(source);
    expect(compiled).toContain('activeBranch');
    expect(compiled).not.toMatch(/__setChild.*count\s*>/) ;

    const evaluated = evaluateCompiled(compiled) as {
      App: () => unknown;
      setCount(n: number): void;
    };

    const root = document.createElement('div');
    const app = createMemoApp(root, h(evaluated.App as any));

    expect(root.querySelector('span')!.textContent).toBe('empty');

    evaluated.setCount(5);
    app.render();
    expect(root.querySelectorAll('span').length).toBe(0);

    evaluated.setCount(0);
    app.render();
    expect(root.querySelector('span')!.textContent).toBe('empty');
  });

  test('compiles || with map on RHS', () => {
    const source = `
      function App() {
        let loading = true;
        let items = ['a', 'b'];
        exports.toggle = () => { loading = !loading; };
        return () => <div>{loading || items.map((item) => <span key={item}>{item}</span>)}</div>;
      }
      exports.App = App;
    `;

    const compiled = compileAuwla(source);
    expect(compiled).toContain('__keyedMap');
    expect(compiled).toContain('activeBranch');

    const evaluated = evaluateCompiled(compiled) as {
      App: () => unknown;
      toggle(): void;
    };

    const root = document.createElement('div');
    const app = createMemoApp(root, h(evaluated.App as any));

    expect(root.querySelectorAll('span').length).toBe(0);

    evaluated.toggle();
    app.render();
    const spans = Array.from(root.querySelectorAll('span'));
    expect(spans.length).toBe(2);
    expect(spans.map((s) => s.textContent)).toEqual(['a', 'b']);
  });

  test('falls back to __setChild for non-boolean-like LHS', () => {
    const source = `
      function getValue() { return ''; }
      function App() {
        return () => <div>{getValue() || <span>fallback</span>}</div>;
      }
      exports.App = App;
    `;

    const compiled = compileAuwla(source);
    expect(compiled).toContain('__setChild');
    expect(compiled).not.toContain('activeBranch');
  });
});

describe('fragment in conditional compilation', () => {
  test('compiles && with fragment to activeBranch', () => {
    const source = `
      function App() {
        let show = false;
        exports.toggle = () => { show = !show; };
        return () => <div>{show && <><span>a</span><span>b</span></>}</div>;
      }
      exports.App = App;
    `;

    const compiled = compileAuwla(source);
    expect(compiled).toContain('activeBranch');

    const evaluated = evaluateCompiled(compiled) as {
      App: () => unknown;
      toggle(): void;
    };

    const root = document.createElement('div');
    const app = createMemoApp(root, h(evaluated.App as any));

    expect(root.querySelectorAll('span span').length).toBe(0);

    evaluated.toggle();
    app.render();
    const spans = Array.from(root.querySelectorAll('span span'));
    expect(spans.length).toBe(2);
    expect(spans.map((s) => s.textContent)).toEqual(['a', 'b']);

    evaluated.toggle();
    app.render();
    expect(root.querySelectorAll('span span').length).toBe(0);
  });

  test('compiles ternary with fragment branches', () => {
    const source = `
      function App() {
        let show = true;
        exports.toggle = () => { show = !show; };
        return () => <div>{show ? <><span>yes1</span><span>yes2</span></> : <><span>no1</span><span>no2</span></>}</div>;
      }
      exports.App = App;
    `;

    const compiled = compileAuwla(source);
    expect(compiled).toContain('activeBranch');

    const evaluated = evaluateCompiled(compiled) as {
      App: () => unknown;
      toggle(): void;
    };

    const root = document.createElement('div');
    const app = createMemoApp(root, h(evaluated.App as any));

    let spans = Array.from(root.querySelectorAll('span span'));
    expect(spans.map((s) => s.textContent)).toEqual(['yes1', 'yes2']);

    evaluated.toggle();
    app.render();
    spans = Array.from(root.querySelectorAll('span span'));
    expect(spans.map((s) => s.textContent)).toEqual(['no1', 'no2']);
  });

  test('compiles || with fragment to activeBranch', () => {
    const source = `
      function App() {
        let ready = false;
        exports.toggle = () => { ready = !ready; };
        return () => <div>{ready || <><span>waiting1</span><span>waiting2</span></>}</div>;
      }
      exports.App = App;
    `;

    const compiled = compileAuwla(source);
    expect(compiled).toContain('activeBranch');

    const evaluated = evaluateCompiled(compiled) as {
      App: () => unknown;
      toggle(): void;
    };

    const root = document.createElement('div');
    const app = createMemoApp(root, h(evaluated.App as any));

    let spans = Array.from(root.querySelectorAll('span span'));
    expect(spans.map((s) => s.textContent)).toEqual(['waiting1', 'waiting2']);

    evaluated.toggle();
    app.render();
    expect(root.querySelectorAll('span span').length).toBe(0);
  });
});
