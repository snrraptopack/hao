import { describe, expect, test } from 'vitest';
import { compileAuwla, evaluateCompiled, createMemoApp, h } from './_helpers';

describe('template cloning', () => {
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
