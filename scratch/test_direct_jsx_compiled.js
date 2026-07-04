import { __componentBlock, __cloneTemplate, __createBlock, __dirtySource, __event, __setText } from 'auwla';
import { component } from 'auwla';

export function DirectCounter() {
  const __dirty = new Set();

  let count = 0;

  return __componentBlock(() => {
        const el0 = __cloneTemplate("<div><p>Count is: </p><button>Increment</button></div>");
        const el1 = el0.childNodes[0]! as HTMLElement;
        const el2 = el0.childNodes[1]! as HTMLElement;
        let eventHandler1 = ((handler) => (event) => { __dirty.add("count"); __dirtySource("count"); return handler(event); })(() => { count++; });
        el2.addEventListener("click", __event((event) => eventHandler1(event)));
        const text0 = document.createTextNode("");
        el1.append(text0);

        let _init = false;
        return __createBlock(() => ({
          node: el0,
          update() {
            const first = !_init;
            if (!_init) {

              _init = true;
            }
          const _all = __dirty.size === 0 || __dirty.delete('__all');
          const _count = _all || __dirty.delete('count');
          if (_count) {
            __setText(text0, count);
            eventHandler1 = ((handler) => (event) => { __dirty.add("count"); __dirtySource("count"); return handler(event); })(() => { count++; });
          }
          __dirty.clear();
          },
        }));
      });
}
