import { describe, expect, test } from 'vitest';
import { compileAuwla, evaluateCompiled, createMemoApp, h } from './_helpers';

describe('input focus preservation', () => {
  test('input does not lose focus when value is patched', () => {
    const source = `
      function App() {
        let text = '';
        exports.setText = (t: string) => { text = t; };
        return () => (
          <div>
            <input value={text} />
          </div>
        );
      }
      exports.App = App;
    `;

    const compiled = compileAuwla(source);
    const evaluated = evaluateCompiled(compiled) as { App: () => unknown; setText(t: string): void };
    const root = document.createElement('div');
    document.body.append(root);
    const app = createMemoApp(root, h(evaluated.App as any));

    const input = root.querySelector('input')! as HTMLInputElement;
    input.focus();
    expect(document.activeElement).toBe(input);

    input.value = 'hello';
    evaluated.setText('hello');
    app.render();

    expect(document.activeElement).toBe(input);
    expect(root.querySelector('input')).toBe(input);
  });

  test('input inside conditional JSX does not lose focus', () => {
    const source = `
      function App() {
        let show = true;
        let text = '';
        exports.setText = (t: string) => { text = t; };
        return () => (
          <div>
            {show && <input value={text} />}
          </div>
        );
      }
      exports.App = App;
    `;

    const compiled = compileAuwla(source);
    const evaluated = evaluateCompiled(compiled) as { App: () => unknown; setText(t: string): void };
    const root = document.createElement('div');
    document.body.append(root);
    const app = createMemoApp(root, h(evaluated.App as any));

    const input = root.querySelector('input')! as HTMLInputElement;
    input.focus();
    expect(document.activeElement).toBe(input);

    input.value = 'hello';
    evaluated.setText('hello');
    app.render();

    expect(document.activeElement).toBe(input);
    expect(root.querySelector('input')).toBe(input);
  });

  test('input inside template-cloned block does not lose focus', () => {
    const source = `
      function App() {
        let text = '';
        exports.setText = (t: string) => { text = t; };
        return () => (
          <section>
            <h2>Title</h2>
            <input value={text} />
            <p>Text: {text}</p>
          </section>
        );
      }
      exports.App = App;
    `;

    const compiled = compileAuwla(source);
    const evaluated = evaluateCompiled(compiled) as { App: () => unknown; setText(t: string): void };
    const root = document.createElement('div');
    document.body.append(root);
    const app = createMemoApp(root, h(evaluated.App as any));

    const input = root.querySelector('input')! as HTMLInputElement;
    input.focus();
    expect(document.activeElement).toBe(input);

    input.value = 'hello';
    evaluated.setText('hello');
    app.render();

    expect(document.activeElement).toBe(input);
    expect(root.querySelector('input')).toBe(input);
  });

  test('input in keyed list row does not lose focus when list updates', () => {
    const source = `
      function App() {
        const items = [
          { id: 'a', text: '' },
          { id: 'b', text: '' },
        ];
        exports.updateItem = (id: string, text: string) => {
          const item = items.find(i => i.id === id);
          if (item) item.text = text;
        };
        return () => (
          <ul>
            {items.map(item => (
              <li key={item.id}>
                <input value={item.text} />
              </li>
            ))}
          </ul>
        );
      }
      exports.App = App;
    `;

    const compiled = compileAuwla(source);
    const evaluated = evaluateCompiled(compiled) as {
      App: () => unknown;
      updateItem(id: string, text: string): void;
    };
    const root = document.createElement('div');
    document.body.append(root);
    const app = createMemoApp(root, h(evaluated.App as any));

    const inputs = root.querySelectorAll('input');
    const firstInput = inputs[0]! as HTMLInputElement;
    firstInput.focus();
    expect(document.activeElement).toBe(firstInput);

    firstInput.value = 'hello';
    evaluated.updateItem('a', 'hello');
    app.render();

    expect(document.activeElement).toBe(firstInput);
  });
});
