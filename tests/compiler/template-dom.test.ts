import { describe, expect, test } from 'vitest';
import { compileAuwla, evaluateCompiled, createMemoApp, h } from './_helpers';

describe('template DOM structure', () => {
  test('InputPatchExample template produces expected child nodes', () => {
    const source = `
      function App() {
        let text = 'Edit me';
        return () => (
          <section class="panel">
            <h2>Title</h2>
            <p>Description</p>
            <input value={text} />
            <p>Text: </p>
            <p>Count: </p>
          </section>
        );
      }
      exports.App = App;
    `;

    const compiled = compileAuwla(source);
    const evaluated = evaluateCompiled(compiled) as { App: () => unknown };
    const root = document.createElement('div');
    createMemoApp(root, h(evaluated.App as any));

    const section = root.querySelector('section')!;
    console.log('childNodes count:', section.childNodes.length);
    for (let i = 0; i < section.childNodes.length; i++) {
      const child = section.childNodes[i]!;
      console.log(i, child.nodeName, child.nodeType === 1 ? (child as HTMLElement).tagName : '');
    }

    expect(section.querySelector('input')).not.toBeNull();
    expect(section.querySelector('h2')).not.toBeNull();
    expect(section.querySelectorAll('p').length).toBe(3);
  });
});
