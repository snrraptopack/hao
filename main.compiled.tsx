import { __componentBlock, __cloneTemplate, __computed, __createBlock, __dirtySource, __event, __escapeHtml, __keyedMap, __setAttribute, __setChild, __setClass, __setElementText, __setProperty, __setStyle, __setText, __spreadProps, __ssrBlock, __ssrKeyedMap, __ssrNode, __ssrStyle, __trackSources, __updateInput, __isCheckboxChecked, __updateCheckbox, __setSelectValue, __updateSelect } from 'auwla';
import {component, emit } from 'auwla';
import './styles.css';

const state:any = {
  count: 0,
  double() { return this.count * 2 }
}

function CounterExample() {
  let one = 0
  let out = __computed(() => one * 2)
  return __componentBlock(() => {
        const __dirty = new Set<string>();
        __trackSources(['state.count', 'state.double']);
        const el0 = document.createElement("section");
        el0.className = "panel";
        const el1 = document.createElement("h2");
        el1.append("Counter");
        el0.append(el1);
        const el2 = document.createElement("p");
        el2.append("State is a local variable in setup.");
        el0.append(el2);
        const el3 = document.createElement("button");
        let eventHandler0 = ((handler) => (event) => { __dirty.add("__all"); __dirtySource("state.count"); return handler(event); })(() => { state.count++; one++ });
        el3.addEventListener("click", __event((event) => eventHandler0(event)));
        el3.append("Count: ");
        const text1 = document.createTextNode("");
        el3.append(text1);
        el0.append(el3);
        const el4 = document.createElement("p");
        el4.append("double ");
        let child2 = document.createComment("auwla:child");
        el4.append(child2);
        el0.append(el4);
        const el5 = document.createElement("p");
        el5.append("outer ");
        const text3 = document.createTextNode("");
        el5.append(text3);
        el0.append(el5);

        return __createBlock(() => ({
          node: el0,
          update() {
          const _all = __dirty.size === 0 || __dirty.delete('__all');
          const _state_count = _all || __dirty.delete('state.count');
          if (_state_count) {
            __setText(text1, state.count);
          }
          const _state_double = _all || __dirty.delete('state.double');
          if (_state_double) {
            child2 = __setChild(el4, child2, state.double());
          }
          if (_all) {
            eventHandler0 = ((handler) => (event) => { __dirty.add("__all"); __dirtySource("state.count"); return handler(event); })(() => { state.count++; one++ });
          }
          __setText(text3, out());
          __dirty.clear();
          },
        }));
      });

}

function TodoExample() {
  const todos = [
    { id: 1, text: 'Learn Auwla', done: false },
  ];
  let newTodoText = '';

  function handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    const text = newTodoText.trim();
    if (!text) return;
    todos.push({ id: Date.now(), text, done: false });
    newTodoText = '';
  }

  return __componentBlock(() => {
        const __dirty = new Set<string>();
        __trackSources(['event.target']);
        const el0 = document.createElement("section");
        el0.className = "panel";
        const el1 = document.createElement("h2");
        el1.append("Todo List");
        el0.append(el1);
        const el2 = document.createElement("form");
        el2.className = "row";
        let eventHandler0 = handleSubmit;
        el2.addEventListener("submit", __event((event) => eventHandler0(event)));
        const el3 = document.createElement("input");
        el3.setAttribute("placeholder", "Add a task");
        let eventHandler1 = ((handler) => (event) => { __dirty.add("newTodoText");  return handler(event); })((event) => {
            newTodoText = (event.target as HTMLInputElement).value;
          });
        el3.addEventListener("input", __event((event) => eventHandler1(event)));
        el2.append(el3);
        const el4 = document.createElement("button");
        el4.setAttribute("type", "submit");
        el4.append("Add");
        el2.append(el4);
        el0.append(el2);
        let child2 = document.createComment("auwla:child");
        el0.append(child2);
        let activeBranch3: number | null = null;
        const el5 = document.createElement("p");
        el5.append("All tasks completed.");
        const el6 = document.createElement("ul");
        el6.className = "todo-list";
        const map0 = __keyedMap(
          todos,
          (todo) => todo.id,
          (todo, index) => __createBlock(() => {
            
            const __dirty = new Set<string>();
            __trackSources(['todo.done', 'todo.text']);
            const el0 = __cloneTemplate("<li><label><input type=\"checkbox\"></input><span></span></label></li>");
            const el1 = el0.childNodes[0]! as HTMLElement;
            const el2 = el0.childNodes[0]!.childNodes[0]! as HTMLElement;
            let eventHandler0 = ((handler) => (event) => { __dirty.add("__all"); __dirtySource("todos"); return handler(event); })(() => { todo.done = !todo.done; });
            el2.addEventListener("change", __event((event) => eventHandler0(event)));
            const el3 = el0.childNodes[0]!.childNodes[1]! as HTMLElement;
            

            __setClass(el0, todo.done ? 'done' : '');
            __setProperty(el2, "checked", todo.done);
            eventHandler0 = ((handler) => (event) => { __dirty.add("__all"); __dirtySource("todos"); return handler(event); })(() => { todo.done = !todo.done; });
            __setElementText(el3, todo.text);


            return {
              node: el0,
              update(todo, index) {
              const _all = __dirty.size === 0 || __dirty.delete('__all');
              const _todo_done = _all || __dirty.delete('todo.done');
              if (_todo_done) {
                __setClass(el0, todo.done ? 'done' : '');
                __setProperty(el2, "checked", todo.done);
                eventHandler0 = ((handler) => (event) => { __dirty.add("__all"); __dirtySource("todos"); return handler(event); })(() => { todo.done = !todo.done; });
              }
              const _todo_text = _all || __dirty.delete('todo.text');
              if (_todo_text) {
                __setElementText(el3, todo.text);
              }
              __dirty.clear();
              },
            };
          }),
          (block, todo, index) => block.update(todo, index),
          (todo) => [todo.done, todo.text],
          false,
        );
        el6.append(map0.node);
        el0.append(el6);

        return __createBlock(() => ({
          node: el0,
          update() {
          const _all = __dirty.size === 0 || __dirty.delete('__all');
          const _newTodoText = _all || __dirty.delete('newTodoText');
          if (_newTodoText) {
            __setProperty(el3, "value", newTodoText);
          }
          const _todos = _all || __dirty.delete('todos');
          if (_todos) {
            if (todos.length === 0) {
  if (activeBranch3 !== 0) { child2 = __setChild(el0, child2, el5); activeBranch3 = 0; }
} else {
  if (activeBranch3 !== null) { child2 = __setChild(el0, child2, null); activeBranch3 = null; }
}
            map0.update(todos);
          }
          if (_all) {
            eventHandler1 = ((handler) => (event) => { __dirty.add("newTodoText");  return handler(event); })((event) => {
            newTodoText = (event.target as HTMLInputElement).value;
          });
          }
          eventHandler0 = handleSubmit;
          __dirty.clear();
          },
        }));
      });
}

function ChildCounter(props: { label: string }) {
  const self = component()
  let count = 0;
  console.log("run again")
  return __componentBlock(() => {
        const __dirty = new Set<string>();
        __trackSources(['props.label']);
        const el0 = document.createElement("button");
        el0.className = "secondary";
        let eventHandler0 = ((handler) => (event) => { __dirty.add("count");  return handler(event); })(() => {
      count++;
      emit(self, "counter",{count})
    });
        el0.addEventListener("click", __event((event) => eventHandler0(event)));
        const text1 = document.createTextNode("");
        el0.append(text1);
        el0.append(": ");
        const text2 = document.createTextNode("");
        el0.append(text2);

        return __createBlock(() => ({
          node: el0,
          update() {
          const _all = __dirty.size === 0 || __dirty.delete('__all');
          const _props_label = _all || __dirty.delete('props.label');
          if (_props_label) {
            __setText(text1, props.label);
          }
          const _count = _all || __dirty.delete('count');
          if (_count) {
            __setText(text2, count);
          }
          if (_all) {
            eventHandler0 = ((handler) => (event) => { __dirty.add("count");  return handler(event); })(() => {
      count++;
      emit(self, "counter",{count})
    });
          }
          __dirty.clear();
          },
        }));
      });
}

function Another(props: { label: string, counter: number }) {
  return __componentBlock(() => {
        __trackSources(['state.count', 'props.label', 'props.counter']);
        const el0 = document.createElement("div");
        let eventHandler0 = (data:{count:number})=> console.log(data);
        el0.addEventListener("counter", __event((event) => eventHandler0((event as CustomEvent).detail)));
        const el1 = document.createElement("button");
        el1.className = "secondary";
        let eventHandler1 = ((handler) => (event) => {  __dirtySource("state.count"); return handler(event); })(() => { state.count++;});
        el1.addEventListener("click", __event((event) => eventHandler1(event)));
        const text2 = document.createTextNode("");
        el1.append(text2);
        el1.append(": ");
        const text3 = document.createTextNode("");
        el1.append(text3);
        el0.append(el1);
        const el2 = document.createElement("p");
        el2.append("double..");
        const text4 = document.createTextNode("");
        el2.append(text4);
        el0.append(el2);
        let child5 = document.createComment("auwla:child");
        el0.append(child5);

        return __createBlock(() => ({
          node: el0,
          update() {
          eventHandler0 = (data:{count:number})=> console.log(data);
          eventHandler1 = ((handler) => (event) => {  __dirtySource("state.count"); return handler(event); })(() => { state.count++;});
          __setText(text2, props.label);
          __setText(text3, state.count);
          __setText(text4, props.counter);
          child5 = __setChild(el0, child5, <ChildCounter label='Another child' />);
          },
        }));
      });
}

function NestedStateExample() {
  let parentCount = 0;

  return __componentBlock(() => {
        const __dirty = new Set<string>();
        const el0 = document.createElement("section");
        el0.className = "panel";
        const el1 = document.createElement("h2");
        el1.append("Nested Components");
        el0.append(el1);
        const el2 = document.createElement("p");
        el2.append("Child setup runs once and keeps its own closure state across parent rerenders.");
        el0.append(el2);
        const el3 = document.createElement("div");
        el3.className = "row";
        const el4 = document.createElement("button");
        let eventHandler0 = ((handler) => (event) => { __dirty.add("parentCount");  return handler(event); })(() => parentCount++);
        el4.addEventListener("click", __event((event) => eventHandler0(event)));
        el4.append("Parent: ");
        const text1 = document.createTextNode("");
        el4.append(text1);
        el3.append(el4);
        let child2 = document.createComment("auwla:child");
        el3.append(child2);
        let child3 = document.createComment("auwla:child");
        el3.append(child3);
        let child4 = document.createComment("auwla:child");
        el3.append(child4);
        el0.append(el3);

        return __createBlock(() => ({
          node: el0,
          update() {
          console.log("parent rendered from another")
          const _all = true;
          const _parentCount = _all || __dirty.delete('parentCount');
          if (_parentCount) {
            eventHandler0 = ((handler) => (event) => { __dirty.add("parentCount");  return handler(event); })(() => parentCount++);
            __setText(text1, parentCount);
          }
          child2 = __setChild(el3, child2, <ChildCounter label="Child A" />);
          child3 = __setChild(el3, child3, <ChildCounter label="Child B" />);
          child4 = __setChild(el3, child4, <Another __auwlaSite="0" label='Another parent' counter={parentCount}/>);
          __dirty.clear();
          },
        }));
      });
}

function KeyedReorderExample() {
  const items = [
    { id: 'a', label: 'Alpha' },
    { id: 'b', label: 'Beta' },
    { id: 'c', label: 'Gamma' },
  ];

  return __componentBlock(() => {
        const el0 = document.createElement("section");
        el0.className = "panel";
        const el1 = document.createElement("h2");
        el1.append("Keyed Reorder");
        el0.append(el1);
        const el2 = document.createElement("p");
        el2.append("Same keys move existing DOM nodes instead of recreating them.");
        el0.append(el2);
        const el3 = document.createElement("button");
        let eventHandler0 = () => items.reverse();
        el3.addEventListener("click", __event((event) => eventHandler0(event)));
        el3.append("Reverse");
        el0.append(el3);
        const el4 = document.createElement("ol");
        el4.className = "cards";
        const map0 = __keyedMap(
          items,
          (item) => item.id,
          (item, index) => __createBlock(() => {
            
            
            __trackSources(['item.label']);
            const el0 = __cloneTemplate("<li></li>");
            
            

            __setElementText(el0, item.label);


            return {
              node: el0,
              update(item, index) {
              __setElementText(el0, item.label);
              },
            };
          }),
          (block, item, index) => block.update(item, index),
          (item) => item.label,
          false,
        );
        el4.append(map0.node);
        el0.append(el4);

        return __createBlock(() => ({
          node: el0,
          update() {
          eventHandler0 = () => items.reverse();
          map0.update(items);
          },
        }));
      });
}

function InputPatchExample() {
  let text = 'Edit me';
  let rerenders = 0;
  console.log("render main",rerenders)
  return __componentBlock(() => {
        const __dirty = new Set<string>();
        __trackSources(['event.target']);
        const el0 = __cloneTemplate("<section class=\"panel\"><h2>Input Patching</h2><p>Controlled input value is patched without replacing the input node.</p><input></input><p>Text: </p><p>Render count: </p></section>");
        const el1 = el0.childNodes[0]! as HTMLElement;
        const el2 = el0.childNodes[1]! as HTMLElement;
        const el3 = el0.childNodes[2]! as HTMLElement;
        let eventHandler0 = ((handler) => (event) => { __dirty.add("text");  return handler(event); })((event) => {
            text = (event.target as HTMLInputElement).value;
          });
        el3.addEventListener("input", __event((event) => eventHandler0(event)));
        const el4 = el0.childNodes[3]! as HTMLElement;
        const el5 = el0.childNodes[4]! as HTMLElement;
        const text1 = document.createTextNode("");
        el4.append(text1);
        const text2 = document.createTextNode("");
        el5.append(text2);

        let _init = false;
        return __createBlock(() => ({
          node: el0,
          update() {
            if (!_init) {

              _init = true;
            }
          rerenders++;
          console.log("render",rerenders)
          const _all = true;
          const _text = _all || __dirty.delete('text');
          if (_text) {
            __setProperty(el3, "value", text);
            __setText(text1, text);
          }
          const _rerenders = _all || __dirty.delete('rerenders');
          if (_rerenders) {
            __setText(text2, rerenders);
          }
          if (_all) {
            eventHandler0 = ((handler) => (event) => { __dirty.add("text");  return handler(event); })((event) => {
            text = (event.target as HTMLInputElement).value;
          });
          }
          __dirty.clear();
          },
        }));
      });
}

export function ExampleApp() {
  return __componentBlock(() => {
        const el0 = document.createElement("main");
        const el1 = document.createElement("header");
        const el2 = document.createElement("h1");
        el2.append("Auwla Examples  child");
        el1.append(el2);
        const el3 = document.createElement("p");
        el3.append("Plain variables, standard JSX, event-driven rerendering, DOM patching.");
        el1.append(el3);
        el0.append(el1);
        const el4 = document.createElement("div");
        el4.className = "grid";
        let child0 = document.createComment("auwla:child");
        el4.append(child0);
        let child1 = document.createComment("auwla:child");
        el4.append(child1);
        let child2 = document.createComment("auwla:child");
        el4.append(child2);
        let child3 = document.createComment("auwla:child");
        el4.append(child3);
        let child4 = document.createComment("auwla:child");
        el4.append(child4);
        el0.append(el4);

        return __createBlock(() => ({
          node: el0,
          update() {
          child0 = __setChild(el4, child0, <CounterExample />);
          child1 = __setChild(el4, child1, <TodoExample />);
          child2 = __setChild(el4, child2, <NestedStateExample />);
          child3 = __setChild(el4, child3, <KeyedReorderExample />);
          child4 = __setChild(el4, child4, <InputPatchExample />);
          },
        }));
      });
}
