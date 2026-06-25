import { __componentBlock, __cloneTemplate, __computed, __createBlock, __dirtySource, __event, __escapeHtml, __keyedMap, __setAttribute, __setChild, __setClass, __setElementText, __setProperty, __setStyle, __setText, __spreadProps, __ssrBlock, __ssrKeyedMap, __ssrNode, __ssrStyle, __trackSources, __updateInput, __isCheckboxChecked, __updateCheckbox, __setSelectValue, __updateSelect } from 'auwla';
import {} from "auwla/jsx-runtime"
import { createMemoApp } from "auwla"

let shared = 0;

function Parent() {
  let count = 0;
  return __componentBlock(() => {
        const __dirty = new Set<string>();
        __trackSources(['props.counter']);
        const el0 = document.createElement("div");
        const el1 = document.createElement("button");
        el1.setAttribute("id", "parentBtn");
        let eventHandler0 = ((handler) => (event) => { __dirty.add("count");  return handler(event); })(() => count++);
        el1.addEventListener("click", __event((event) => eventHandler0(event)));
        el1.append("Parent: ");
        const text1 = document.createTextNode("");
        el1.append(text1);
        el0.append(el1);
        const el2 = document.createElement("span");
        el2.setAttribute("id", "child");
        const text2 = document.createTextNode("");
        el2.append(text2);
        const text3 = document.createTextNode("");
        el2.append(text3);
        el0.append(el2);

        return __createBlock(() => ({
          node: el0,
          update() {
          const _all = __dirty.size === 0 || __dirty.delete('__all');
          const _count = _all || __dirty.delete('count');
          if (_count) {
            eventHandler0 = ((handler) => (event) => { __dirty.add("count");  return handler(event); })(() => count++);
            __setText(text1, count);
          }
          const _props_counter = _all || __dirty.delete('props.counter');
          if (_props_counter) {
            __setText(text2, count);
          }
          __setText(text3, shared);
          __dirty.clear();
          },
        }));
      });
}

function Child(props: { counter: number }) {
  return __componentBlock(() => {
        __trackSources(['props.counter']);
        const el0 = __cloneTemplate("<span id=\"child\"></span>");
        const text0 = document.createTextNode("");
        el0.append(text0);
        const text1 = document.createTextNode("");
        el0.append(text1);

        let _init = false;
        return __createBlock(() => ({
          node: el0,
          update() {
            if (!_init) {

              _init = true;
            }
          __setText(text0, props.counter);
          __setText(text1, shared);
          },
        }));
      });
}

const root = document.getElementById('app')!;
createMemoApp(root, <Parent />);

console.log('initial child:', document.getElementById('child')!.textContent);
document.getElementById('parentBtn')!.click();
await new Promise(r => setTimeout(r, 50));
console.log('after click child:', document.getElementById('child')!.textContent);
