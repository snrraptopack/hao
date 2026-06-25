import { JSDOM } from 'jsdom';
const dom = new JSDOM('<!DOCTYPE html><html><body><div id="app"></div></body></html>');
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.Node = dom.window.Node;
globalThis.Element = dom.window.Element;
globalThis.HTMLElement = dom.window.HTMLElement;
globalThis.SVGElement = dom.window.SVGElement;
globalThis.Text = dom.window.Text;
globalThis.Comment = dom.window.Comment;
globalThis.DocumentFragment = dom.window.DocumentFragment;
globalThis.CustomEvent = dom.window.CustomEvent;
globalThis.Event = dom.window.Event;

const { createMemoApp, h } = await import('./src/index.ts');

function Parent() {
  let count = 0;
  return () => h('div', null,
    h('button', { id: 'parentBtn', onClick: () => count++ }, 'Parent: ', count),
    h(Child, { counter: count })
  );
}

function Child(props) {
  return () => h('span', { id: 'child' }, props.counter);
}

const root = document.getElementById('app');
createMemoApp(root, h(Parent));

console.log('initial child:', document.getElementById('child').textContent);
document.getElementById('parentBtn').click();
await new Promise(r => setTimeout(r, 50));
console.log('after click child:', document.getElementById('child').textContent);
