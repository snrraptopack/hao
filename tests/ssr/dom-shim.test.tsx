// @vitest-environment node

import { describe, expect, test } from 'vitest';
import { installDomShim, auwlaDocument } from '../../src/ssr/dom-shim';
import { renderToString } from '../../src/ssr';
import { h } from '../../src';
import { __cloneTemplate } from '../../src/compiler-runtime';

describe('SSR DOM shim', () => {
  test('installs globals and renders with the minimal shim', async () => {
    installDomShim();

    function App() {
      return () => <div class="app">Shim works</div>;
    }

    const html = await renderToString(h(App));
    expect(html).toBe('<div class="app">Shim works</div>');
  });

  test('clones compiled templates with the minimal shim', async () => {
    installDomShim();

    function App() {
      return () => __cloneTemplate('<ul><li>One</li><li>Two</li></ul>');
    }

    const html = await renderToString(h(App));
    expect(html).toBe('<ul><li>One</li><li>Two</li></ul>');
  });

  test('creates elements via the minimal document', () => {
    installDomShim();
    const el = auwlaDocument.createElement('input');
    el.setAttribute('type', 'text');
    el.setAttribute('value', 'hello');
    expect(el.outerHTML).toBe('<input type="text" value="hello">');
  });
});
