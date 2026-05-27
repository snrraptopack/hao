import { describe, expect, test } from 'vitest';
import { compileAuwla, evaluateCompiled, createMemoApp, h } from './_helpers';

describe('template input parsing', () => {
  test('self-closing input in template produces correct DOM', () => {
    const source = `
      function App() {
        return () => (
          <section>
            <input />
            <p>Text</p>
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
    console.log('childNodes:', section.childNodes.length);
    for (let i = 0; i < section.childNodes.length; i++) {
      console.log(i, section.childNodes[i]!.nodeName, section.childNodes[i]!.nodeType === 3 ? JSON.stringify((section.childNodes[i] as Text).textContent) : '');
    }

    expect(section.querySelector('input')).not.toBeNull();
    expect(section.querySelector('p')).not.toBeNull();
  });
});
