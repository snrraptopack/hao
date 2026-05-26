import ts from 'typescript';
import { describe, expect, test } from 'vitest';
import {
  __componentBlock,
  __cloneTemplate,
  __createBlock,
  __event,
  __keyedMap,
  __setAttribute,
  __setChild,
  __setClass,
  __setProperty,
  __setStyle,
  __setText,
  createMemoApp,
  h,
} from '../src';
import { compileAuwla } from '../src/compiler';

function evaluateCompiled(source: string) {
  const withoutImport = source.replace(
    /import \{([^}]+)\} from 'auwla';/,
    'const {$1} = runtime;',
  );
  const js = ts.transpileModule(withoutImport, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  }).outputText;
  const exports: Record<string, unknown> = {};

  Function('runtime', 'exports', js)({
    __componentBlock,
    __cloneTemplate,
    __createBlock,
    __event,
    __keyedMap,
    __setAttribute,
    __setChild,
    __setClass,
    __setProperty,
    __setStyle,
    __setText,
    createMemoApp,
  }, exports);

  return exports;
}

describe('Auwla compiler', () => {
  test('lowers a simple render closure into a direct DOM block', async () => {
    const source = `
      function Counter() {
        let count = 0;
        return () => <button class={count % 2 ? 'odd' : 'even'} onClick={() => { count++; }}>Count: {count}</button>;
      }
      exports.Counter = Counter;
    `;

    const compiled = compileAuwla(source);
    expect(compiled).toContain('__componentBlock');
    expect(compiled).toContain('__setClass');
    expect(compiled).toContain('__setText');
    expect(compiled).not.toContain('return () => <button');

    const { Counter } = evaluateCompiled(compiled) as { Counter: () => unknown };
    const root = document.createElement('div');
    createMemoApp(root, h(Counter as any));
    const button = root.querySelector('button')!;

    expect(button.textContent).toBe('Count: 0');
    expect(button.className).toBe('even');

    button.click();
    await new Promise<void>((resolve) => queueMicrotask(resolve));

    expect(root.querySelector('button')).toBe(button);
    expect(button.textContent).toBe('Count: 1');
    expect(button.className).toBe('odd');
  });

  test('leaves unsupported JSX untouched for runtime fallback', () => {
    const source = `
      function App(props) {
        return () => <props.tag>Hello</props.tag>;
      }
    `;

    expect(compileAuwla(source)).toBe(source);
  });

  test('leaves component JSX untouched for runtime fallback', () => {
    const source = `
      function Label(props) {
        return () => <span>{props.text}</span>;
      }

      function App() {
        return () => <Label text="Hello" />;
      }
    `;

    const compiled = compileAuwla(source);

    expect(compiled).toContain('__componentBlock');
    expect(compiled).toContain('return () => <Label text="Hello" />');
    expect(compiled).not.toContain('document.createElement("Label")');
  });

  test('patches dynamic child expressions instead of stringifying them', () => {
    const source = `
      function App() {
        let show = false;
        const popup = document.createElement('span');
        popup.textContent = 'Popup';
        exports.toggle = () => { show = !show; };
        return () => <section>{show && popup}</section>;
      }
      exports.App = App;
    `;

    const compiled = compileAuwla(source);
    expect(compiled).toContain('__setChild');

    const evaluated = evaluateCompiled(compiled) as { App: () => unknown; toggle(): void };
    const root = document.createElement('div');
    const app = createMemoApp(root, h(evaluated.App as any));

    expect(root.textContent).toBe('');

    evaluated.toggle();
    app.render();

    expect(root.textContent).toBe('Popup');
    expect(root.textContent).not.toContain('[object');
  });

  test('compiles style objects and decoded JSX text correctly', () => {
    const source = `
      function App() {
        let color = 'red';
        exports.blue = () => { color = 'blue'; };
        return () => <div style={{ color, paddingLeft: 8 }}>Hello &amp; welcome</div>;
      }
      exports.App = App;
    `;

    const compiled = compileAuwla(source);
    expect(compiled).toContain('__setStyle');

    const evaluated = evaluateCompiled(compiled) as { App: () => unknown; blue(): void };
    const root = document.createElement('div');
    const app = createMemoApp(root, h(evaluated.App as any));
    const div = root.querySelector('div')!;

    expect(div.textContent).toBe('Hello & welcome');
    expect(div.style.color).toBe('red');
    expect(div.style.paddingLeft).toBe('8px');

    evaluated.blue();
    app.render();

    expect(div.style.color).toBe('blue');
  });

  test('compiles static boolean attributes into setup', () => {
    const source = `
      function App() {
        let label = 'Ready';
        return () => <button disabled>{label}</button>;
      }
      exports.App = App;
    `;

    const compiled = compileAuwla(source);
    // With template cloning, boolean attributes are baked into the HTML string
    expect(compiled).toContain('__cloneTemplate("<button disabled></button>"');

    const updateBody = compiled.slice(compiled.indexOf('update()'));
    expect(updateBody).not.toContain('__setAttribute(el0, "disabled", true);');
  });

  test('moves key-derived row patches into row creation', () => {
    const source = `
      function List() {
        const items = [{ id: 1, value: 2 }];
        return () => (
          <div>
            {items.map((item) => (
              <div key={item.id}>
                <span>{item.id}</span>
                <strong>{item.value}</strong>
              </div>
            ))}
          </div>
        );
      }
    `;

    const compiled = compileAuwla(source);
    const rowUpdate = compiled.slice(compiled.indexOf('update(item, index)'));

    expect(compiled).toContain('__setText(text0, item.id);');
    expect(rowUpdate).not.toContain('__setText(text0, item.id);');
    expect(rowUpdate).toContain('__setText(text1, item.value);');
  });

  test('keeps closure variables in keyed row dependencies', () => {
    const source = `
      function List() {
        let selected = 0;
        const rows = [{ id: 1, label: 'A' }];
        exports.select = () => { selected = 1; };
        return () => (
          <table>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} class={selected === row.id ? 'selected' : ''}>
                  <td>{row.label}</td>
                </tr>
              ))}
            </tbody>
          </table>
        );
      }
      exports.List = List;
    `;

    const compiled = compileAuwla(source);
    expect(compiled).toContain("(row) => [selected === row.id ? 'selected' : '', row.label]");

    const evaluated = evaluateCompiled(compiled) as { List: () => unknown; select(): void };
    const root = document.createElement('div');
    const app = createMemoApp(root, h(evaluated.List as any));

    expect(root.querySelector('tr')!.className).toBe('');

    evaluated.select();
    app.render();

    expect(root.querySelector('tr')!.className).toBe('selected');
  });

  test('lowers keyed map rows into reusable row blocks', () => {
    const source = `
      function List() {
        let items = [
          { id: 'a', label: 'A', done: false },
          { id: 'b', label: 'B', done: false },
          { id: 'c', label: 'C', done: false },
        ];
        exports.actions = {
          replaceB() {
            items = [items[0], { id: 'b', label: 'B2', done: true }, items[2]];
          },
          swap() {
            items = [items[2], items[1], items[0]];
          },
          removeB() {
            items = [items[0], items[2]];
          },
        };
        return () => (
          <ul>
            {items.map((item) => (
              <li key={item.id} class={item.done ? 'done' : ''}>{item.label}</li>
            ))}
          </ul>
        );
      }
      exports.List = List;
    `;

    const compiled = compileAuwla(source);
    expect(compiled).toContain('__keyedMap');
    expect(compiled).not.toContain('items.map');

    const evaluated = evaluateCompiled(compiled) as {
      List: () => unknown;
      actions?: { replaceB(): void; swap(): void; removeB(): void };
    };
    const root = document.createElement('div');
    const app = createMemoApp(root, h(evaluated.List as any));
    const actions = evaluated.actions!;

    const initial = Array.from(root.querySelectorAll('li'));
    expect(initial.map((node) => node.textContent)).toEqual(['A', 'B', 'C']);

    actions.replaceB();
    app.render();

    const replaced = Array.from(root.querySelectorAll('li'));
    expect(replaced.map((node) => node.textContent)).toEqual(['A', 'B2', 'C']);
    expect(replaced[1]).toBe(initial[1]);
    expect(replaced[1]!.className).toBe('done');

    actions.swap();
    app.render();

    const swapped = Array.from(root.querySelectorAll('li'));
    expect(swapped.map((node) => node.textContent)).toEqual(['C', 'B2', 'A']);
    expect(swapped[0]).toBe(initial[2]);
    expect(swapped[1]).toBe(initial[1]);
    expect(swapped[2]).toBe(initial[0]);

    actions.removeB();
    app.render();

    const removed = Array.from(root.querySelectorAll('li'));
    expect(removed.map((node) => node.textContent)).toEqual(['C', 'A']);
    expect(removed[0]).toBe(initial[2]);
    expect(removed[1]).toBe(initial[0]);
  });

  test('leaves unkeyed maps untouched for runtime fallback', () => {
    const source = `
      function List() {
        const items = ['A'];
        return () => <ul>{items.map((item) => <li>{item}</li>)}</ul>;
      }
    `;

    expect(compileAuwla(source)).toBe(source);
  });

  test('compiles fragments as transparent child containers', () => {
    const source = `
      function App() {
        let show = false;
        exports.toggle = () => { show = !show; };
        return () => (
          <div>
            <>{show ? 'Yes' : 'No'}</>
          </div>
        );
      }
      exports.App = App;
    `;

    const compiled = compileAuwla(source);
    expect(compiled).toContain('__setText');

    const evaluated = evaluateCompiled(compiled) as { App: () => unknown; toggle(): void };
    const root = document.createElement('div');
    const app = createMemoApp(root, h(evaluated.App as any));

    expect(root.textContent).toBe('No');

    evaluated.toggle();
    app.render();

    expect(root.textContent).toBe('Yes');
  });

  test('compiles ref callbacks in template-cloned root blocks', () => {
    const source = `
      function App() {
        let refEl = null;
        exports.getRef = () => refEl;
        return () => <div ref={(el) => { refEl = el; }}>Hello</div>;
      }
      exports.App = App;
    `;

    const compiled = compileAuwla(source);
    expect(compiled).toContain('__cloneTemplate');

    const evaluated = evaluateCompiled(compiled) as { App: () => unknown; getRef(): HTMLElement | null };
    const root = document.createElement('div');
    createMemoApp(root, h(evaluated.App as any));

    expect(evaluated.getRef()).toBe(root.querySelector('div'));
  });

  test('uses template cloning for root blocks when possible', () => {
    const source = `
      function App() {
        let label = 'Hello';
        return () => <section class="page"><h1>{label}</h1></section>;
      }
      exports.App = App;
    `;

    const compiled = compileAuwla(source);
    expect(compiled).toContain('__cloneTemplate');
    expect(compiled).toContain('<h1></h1></section>');
    expect(compiled).not.toContain('document.createElement("section")');
  });
});
