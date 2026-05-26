import { describe, expect, test } from 'vitest';
import { compileAuwla, evaluateCompiled, createMemoApp, h } from './_helpers';

describe('component definition patterns', () => {
  test('inlines const arrow function components', () => {
    const source = `
      const Label = (props) => {
        return <span class="label">{props.text}</span>;
      };

      function App() {
        let label = 'Hello';
        exports.update = () => { label = 'World'; };
        return () => <div><Label text={label} /></div>;
      }
      exports.App = App;
    `;

    const compiled = compileAuwla(source);
    expect(compiled).not.toContain('<Label');
    expect(compiled).toContain('__componentBlock');

    const evaluated = evaluateCompiled(compiled) as { App: () => unknown; update(): void };
    const root = document.createElement('div');
    const app = createMemoApp(root, h(evaluated.App as any));

    expect(root.querySelector('span')!.textContent).toBe('Hello');

    evaluated.update();
    app.render();

    expect(root.querySelector('span')!.textContent).toBe('World');
  });

  test('inlines exported function components', () => {
    const source = `
      export function Label(props) {
        return <span>{props.text}</span>;
      }

      function App() {
        let label = 'Hi';
        exports.update = () => { label = 'Bye'; };
        return () => <div><Label text={label} /></div>;
      }
      exports.App = App;
    `;

    const compiled = compileAuwla(source);
    expect(compiled).not.toContain('<Label');
    expect(compiled).toContain('__componentBlock');

    const evaluated = evaluateCompiled(compiled) as { App: () => unknown; update(): void };
    const root = document.createElement('div');
    const app = createMemoApp(root, h(evaluated.App as any));

    expect(root.querySelector('span')!.textContent).toBe('Hi');

    evaluated.update();
    app.render();

    expect(root.querySelector('span')!.textContent).toBe('Bye');
  });

  test('inlines components with no props parameter', () => {
    const source = `
      function Divider() {
        return <hr class="divider" />;
      }

      function App() {
        return () => <div><Divider /></div>;
      }
      exports.App = App;
    `;

    const compiled = compileAuwla(source);
    expect(compiled).not.toContain('<Divider');
    expect(compiled).toContain('__componentBlock');

    const evaluated = evaluateCompiled(compiled) as { App: () => unknown };
    const root = document.createElement('div');
    createMemoApp(root, h(evaluated.App as any));

    expect(root.querySelector('hr')!.className).toBe('divider');
  });

  test('inlines nested component calls', () => {
    const source = `
      function Badge(props) {
        return <span class="badge">{props.text}</span>;
      }

      function Card(props) {
        return <div class="card"><Badge text={props.badge} /></div>;
      }

      function App() {
        let badge = 'New';
        exports.update = () => { badge = 'Hot'; };
        return () => <Card badge={badge} />;
      }
      exports.App = App;
    `;

    const compiled = compileAuwla(source);
    // Card and Badge are inlined into App's block; their original definitions
    // remain in the source as dead code (they return JSX, not closures).
    expect(compiled).toContain('__componentBlock');
    expect(compiled).toContain('el0.className = "card"');
    expect(compiled).toContain('el1.className = "badge"');

    const evaluated = evaluateCompiled(compiled) as { App: () => unknown; update(): void };
    const root = document.createElement('div');
    const app = createMemoApp(root, h(evaluated.App as any));

    expect(root.querySelector('.badge')!.textContent).toBe('New');

    evaluated.update();
    app.render();

    expect(root.querySelector('.badge')!.textContent).toBe('Hot');
  });
});

describe('multiple lists in same render', () => {
  test('compiles multiple keyed maps in one closure', () => {
    const source = `
      function App() {
        const itemsA = [{ id: 1, label: 'A' }];
        const itemsB = [{ id: 2, label: 'B' }];
        return () => (
          <div>
            <ul>{itemsA.map((item) => <li key={item.id}>{item.label}</li>)}</ul>
            <ol>{itemsB.map((item) => <li key={item.id}>{item.label}</li>)}</ol>
          </div>
        );
      }
      exports.App = App;
    `;

    const compiled = compileAuwla(source);
    expect(compiled).toContain('__keyedMap');
    expect(compiled).not.toContain('itemsA.map');
    expect(compiled).not.toContain('itemsB.map');

    const evaluated = evaluateCompiled(compiled) as { App: () => unknown };
    const root = document.createElement('div');
    createMemoApp(root, h(evaluated.App as any));

    expect(root.querySelector('ul li')!.textContent).toBe('A');
    expect(root.querySelector('ol li')!.textContent).toBe('B');
  });
});

describe('empty and whitespace handling', () => {
  test('ignores empty JSX expressions', () => {
    const source = `
      function App() {
        return () => <div>Hello{}World</div>;
      }
      exports.App = App;
    `;

    const compiled = compileAuwla(source);
    expect(compiled).toContain('__componentBlock');

    const evaluated = evaluateCompiled(compiled) as { App: () => unknown };
    const root = document.createElement('div');
    createMemoApp(root, h(evaluated.App as any));

    expect(root.textContent).toBe('HelloWorld');
  });

  test('ignores whitespace-only text nodes', () => {
    const source = `
      function App() {
        return () => (
          <div>
            <span>One</span>
            <span>Two</span>
          </div>
        );
      }
      exports.App = App;
    `;

    const compiled = compileAuwla(source);
    expect(compiled).toContain('__componentBlock');

    const evaluated = evaluateCompiled(compiled) as { App: () => unknown };
    const root = document.createElement('div');
    createMemoApp(root, h(evaluated.App as any));

    const spans = root.querySelectorAll('span');
    expect(spans.length).toBe(2);
  });
});

describe('boolean attributes', () => {
  test('compiles boolean attributes without value in non-template blocks', () => {
    const source = `
      function App() {
        let checked = false;
        exports.toggle = () => { checked = !checked; };
        return () => <input type="checkbox" checked={checked} />;
      }
      exports.App = App;
    `;

    const compiled = compileAuwla(source);
    expect(compiled).toContain('__setProperty');

    const evaluated = evaluateCompiled(compiled) as { App: () => unknown; toggle(): void };
    const root = document.createElement('div');
    const app = createMemoApp(root, h(evaluated.App as any));
    const input = root.querySelector('input')! as HTMLInputElement;

    expect(input.checked).toBe(false);

    evaluated.toggle();
    app.render();

    expect(input.checked).toBe(true);
  });
});

describe('known compiler limitations', () => {
  test('leaves dynamic tags untouched', () => {
    const source = `
      function App(props) {
        return () => <props.tag>Hello</props.tag>;
      }
    `;
    expect(compileAuwla(source)).toBe(source);
  });

  test('leaves components with children untouched', () => {
    const source = `
      function Card(props) {
        return <div class="card">{props.children}</div>;
      }
      function App() {
        return () => <Card><span>Hello</span></Card>;
      }
    `;
    const compiled = compileAuwla(source);
    expect(compiled).toContain('<Card>');
  });

  test('leaves components with conditional returns untouched', () => {
    const source = `
      function Card(props) {
        if (props.highlighted) return <div class="highlight" />;
        return <div class="card" />;
      }
      function App() {
        return () => <Card highlighted={true} />;
      }
    `;
    const compiled = compileAuwla(source);
    expect(compiled).toContain('<Card');
  });
});
