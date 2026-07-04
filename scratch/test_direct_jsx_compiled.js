import { __componentBlock, __cloneTemplate, __computed, __createBlock, __effect, __dirtySource, __event, __setText, component as __component } from 'auwla';
export function Counter() {
  const __dirty = new Set();
  const __self = __component();

  let count = 0;

  // Derived computed values are automatically detected and compiled to computed getters!
  let double = __computed(() => count * 2, ['count']);

  // Side-effects trigger when dependencies change
  // Note: currently side-effects inside setup still need __effect wrapper
  // but let's check how the compiler handles this.
  return __componentBlock(() => {
        const el0 = __cloneTemplate("<div><button>Count: </button><p>Double: </p></div>");
        const el1 = el0.childNodes[0]! as HTMLElement;
        let eventHandler0 = ((handler) => (event) => { __dirty.add("count"); __dirtySource("count"); return handler(event); })(() => count++);
        el1.addEventListener("click", __event((event) => eventHandler0(event)));
        const el2 = el0.childNodes[1]! as HTMLElement;
        const text1 = document.createTextNode("");
        el1.append(text1);
        const text2 = document.createTextNode("");
        el2.append(text2);

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
            eventHandler0 = ((handler) => (event) => { __dirty.add("count"); __dirtySource("count"); return handler(event); })(() => count++);
            __setText(text1, count);
          }
          __setText(text2, double());
          __dirty.clear();
          },
        }));
      });
}
