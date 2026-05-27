import { describe, expect, test } from 'vitest';
import { compileAuwla, evaluateCompiled, createMemoApp, h } from './_helpers';

const tick = () => new Promise<void>((resolve) => queueMicrotask(resolve));

describe('input event focus preservation', () => {
  test('InputPatchExample: input event triggers re-render without losing focus', async () => {
    const source = `
      function InputPatchExample() {
        let text = 'Edit me';
        return () => (
          <section class="panel">
            <input
              value={text}
              onInput={(event) => {
                text = (event.target as HTMLInputElement).value;
              }}
            />
            <p>Text: {text}</p>
          </section>
        );
      }
      exports.InputPatchExample = InputPatchExample;
    `;

    const compiled = compileAuwla(source);
    const evaluated = evaluateCompiled(compiled) as { InputPatchExample: () => unknown };
    const root = document.createElement('div');
    document.body.append(root);
    createMemoApp(root, h(evaluated.InputPatchExample as any));

    const input = root.querySelector('input')! as HTMLInputElement;
    input.focus();
    input.setSelectionRange(7, 7); // cursor at end of "Edit me"

    expect(document.activeElement).toBe(input);

    // Simulate browser behavior: update value, then fire input event
    input.value = 'Edit me!';
    input.dispatchEvent(new InputEvent('input', { bubbles: true }));

    // Wait for the microtask-scheduled re-render
    await tick();

    // Focus should still be on the input
    expect(document.activeElement).toBe(input);
    expect(input.value).toBe('Edit me!');
  });

  test('TodoExample: typing in todo input does not lose focus', async () => {
    const source = `
      function TodoExample() {
        let newTodoText = '';
        return () => (
          <section class="panel">
            <form>
              <input
                value={newTodoText}
                placeholder="Add a task"
                onInput={(event) => {
                  newTodoText = (event.target as HTMLInputElement).value;
                }}
              />
              <button type="submit">Add</button>
            </form>
          </section>
        );
      }
      exports.TodoExample = TodoExample;
    `;

    const compiled = compileAuwla(source);
    const evaluated = evaluateCompiled(compiled) as { TodoExample: () => unknown };
    const root = document.createElement('div');
    document.body.append(root);
    createMemoApp(root, h(evaluated.TodoExample as any));

    const input = root.querySelector('input')! as HTMLInputElement;
    input.focus();
    expect(document.activeElement).toBe(input);

    input.value = 'hello';
    input.dispatchEvent(new InputEvent('input', { bubbles: true }));
    await tick();

    expect(document.activeElement).toBe(input);
    expect(input.value).toBe('hello');
  });
});
