import { __componentBlock, __cloneTemplate, __computed, __createBlock, __dirtySource, __event, __hydrateElement, __hydrateComment, __keyedMap, __setAttribute, __setChild, __setElementText, __setProperty, __setText, __trackSources } from 'auwla';
import { component } from 'auwla';
import { event } from 'auwla/events';
import "auwla/events/hotkey"
import "auwla/events/intersect"
import "auwla/events/touch"
import type {} from 'auwla/jsx-runtime';
import './styles/event-chain.css';

type SavedPayload = {
  query: string;
  count: number;
  at: string;
};

type Action = {
  id: string;
  label: string;
};

const actions: Action[] = [
  { id: 'archive', label: 'Archive' },
  { id: 'flag', label: 'Flag' },
  { id: 'delete', label: 'Delete' },
];

function SearchPanel() {
  const __dirty = new Set();

  const self = component();
  let query = '';
  let submitted = '';
  let pointer = '0, 0';
  let saves = 0;
  let shortcut = 'None';
  let delegated = 'No action yet';
  let selfClicks = 0;
  let childClicks = 0;
  let primaryClicks = 0;
  let secondaryClicks = 0;
  let onceMessage = 'Not clicked';
  let cooldownMessage = 'Ready';

  const status = __computed(() => () => `Query: ${query || '-'} / Submitted: ${submitted || '-'}`, ['query', 'submitted']);

  return __componentBlock(() => {
        __trackSources(['event.prevent', 'event.mod', 'event.input', 'inputEvent.target', 'event.pointerMove', 'pointerEvent.offsetX', 'pointerEvent.offsetY', 'event.target', 'target.dataset', 'clickEvent.target', 'button.dataset', 'event.self', 'event.stop', 'event.left', 'event.right', 'event.once', 'event.cooldown', 'event.emit', 'event.key', 'keyboardEvent.key']);
        const el0 = __hydrateElement("section");
        el0.className = "panel reference";
        const el1 = __hydrateElement("form");
        el1.className = "search";
        let eventHandler0 = ((handler) => (event) => { __dirty.add("__all"); __dirtySource("submitted"); return handler(event); })(event.prevent.if(() => query.trim() !== '' && query !== 'wow').handler(() => {
          submitted = query;
        }));
        el1.addEventListener("submit", __event((event) => eventHandler0(event)));
        let eventHandler1 = ((handler) => (event) => { __dirty.add("__all"); __dirtySource("query"); __dirtySource("submitted"); __dirtySource("shortcut"); return handler(event); })(event.mod.key('k').prevent.handler(() => {
          query = '';
          submitted = '';
          shortcut = 'Mod+K cleared the form';
        }));
        el1.addEventListener("keydown", __event((event) => eventHandler1(event)));
        const el2 = __hydrateElement("input");
        el2.setAttribute("placeholder", "Type anything except \"wow\"");
        let eventHandler2 = ((handler) => (event) => { __dirty.add("__all"); __dirtySource("query"); return handler(event); })(event.input.debounce(250).handler((inputEvent) => {
            query = (inputEvent.target as HTMLInputElement).value;
          }));
        el2.addEventListener("input", __event((event) => eventHandler2(event)));
        el1.append(el2);
        const el3 = __hydrateElement("button");
        el3.setAttribute("type", "submit");
        el3.append("Submit");
        el1.append(el3);
        el0.append(el1);
        const el4 = __hydrateElement("p");
        el4.className = "status";
        let child3 = __hydrateComment("auwla:child");
        el4.append(child3);
        el0.append(el4);
        const el5 = __hydrateElement("p");
        el5.className = "note";
        el5.append("`prevent.if(() => ...)` blocks empty and \"wow\" submissions. `mod.key('k')` clears the form.");
        el0.append(el5);
        const el6 = __hydrateElement("div");
        el6.className = "tracker";
        let eventHandler4 = ((handler) => (event) => { __dirty.add("__all"); __dirtySource("pointer"); return handler(event); })(event.pointerMove.throttle(80).handler((pointerEvent) => {
          pointer = `${Math.round(pointerEvent.offsetX)}, ${Math.round(pointerEvent.offsetY)}`;
        }));
        el6.addEventListener("pointermove", __event((event) => eventHandler4(event)));
        const el7 = __hydrateElement("span");
        el6.append(el7);
        el0.append(el6);
        const el8 = __hydrateElement("div");
        el8.className = "reference-grid";
        const el9 = __hydrateElement("article");
        el9.className = "tile";
        const el10 = __hydrateElement("h2");
        el10.append("Delegated Target");
        el9.append(el10);
        const el11 = __hydrateElement("div");
        el11.className = "toolbar";
        let eventHandler5 = ((handler) => (event) => { __dirty.add("__all"); __dirtySource("target.dataset"); __dirtySource("delegated"); return handler(event); })(event.target((target) => target instanceof HTMLButtonElement && !!target.dataset.action).stop.handler((clickEvent) => {
              const button = clickEvent.target as HTMLButtonElement;
              delegated = `Selected ${button.dataset.action}`;
            }));
        el11.addEventListener("click", __event((event) => eventHandler5(event)));
        const map0 = __keyedMap(
          actions,
          (action) => action.id,
          (action, index) => __createBlock(() => {
            
            
            __trackSources(['action.id', 'action.label']);
            const el0 = __cloneTemplate("<button type=\"button\" class=\"secondary\"></button>");
            
            

            __setAttribute(el0, "data-action", action.id);
            __setElementText(el0, action.label);


            
            return {
              node: el0,
              update(action, index) {
              __setAttribute(el0, "data-action", action.id);
              __setElementText(el0, action.label);
              },
            };
          }),
          (block, action, index) => block.update(action, index),
          (action) => action.label,
          false,
        );
        el11.append(map0.node);
        el9.append(el11);
        const el12 = __hydrateElement("p");
        el9.append(el12);
        el8.append(el9);
        const el13 = __hydrateElement("article");
        el13.className = "tile";
        const el14 = __hydrateElement("h2");
        el14.append("Self Filter");
        el13.append(el14);
        const el15 = __hydrateElement("div");
        el15.className = "self-box";
        let eventHandler6 = ((handler) => (event) => { __dirty.add("__all"); __dirtySource("selfClicks"); return handler(event); })(event.self.handler(() => {
              selfClicks++;
            }));
        el15.addEventListener("click", __event((event) => eventHandler6(event)));
        const el16 = __hydrateElement("button");
        el16.setAttribute("type", "button");
        el16.className = "secondary";
        let eventHandler7 = ((handler) => (event) => { __dirty.add("__all"); __dirtySource("childClicks"); return handler(event); })(event.stop.handler(() => {
                childClicks++;
              }));
        el16.addEventListener("click", __event((event) => eventHandler7(event)));
        el16.append("\r\n              Child Button\r\n            ");
        el15.append(el16);
        el13.append(el15);
        const el17 = __hydrateElement("p");
        el17.append("Box: ");
        const text8 = document.createTextNode("");
        el17.append(text8);
        el17.append(" / Child: ");
        const text9 = document.createTextNode("");
        el17.append(text9);
        el13.append(el17);
        el8.append(el13);
        const el18 = __hydrateElement("article");
        el18.className = "tile";
        const el19 = __hydrateElement("h2");
        el19.append("Mouse Buttons");
        el18.append(el19);
        const el20 = __hydrateElement("button");
        el20.setAttribute("type", "button");
        el20.className = "wide secondary";
        let eventHandler10 = ((handler) => (event) => { __dirty.add("__all"); __dirtySource("primaryClicks"); return handler(event); })(event.left.handler(() => {
              primaryClicks++;
            }));
        el20.addEventListener("mousedown", __event((event) => eventHandler10(event)));
        el20.append("\r\n            Primary: ");
        const text11 = document.createTextNode("");
        el20.append(text11);
        el18.append(el20);
        const el21 = __hydrateElement("button");
        el21.setAttribute("type", "button");
        el21.className = "wide secondary";
        let eventHandler12 = ((handler) => (event) => { __dirty.add("__all"); __dirtySource("secondaryClicks"); return handler(event); })(event.right.handler(() => {
              secondaryClicks++;
            }));
        el21.addEventListener("mousedown", __event((event) => eventHandler12(event)));
        el21.append("\r\n            Secondary: ");
        const text13 = document.createTextNode("");
        el21.append(text13);
        el18.append(el21);
        el8.append(el18);
        const el22 = __hydrateElement("article");
        el22.className = "tile";
        const el23 = __hydrateElement("h2");
        el23.append("Once And Cooldown");
        el22.append(el23);
        const el24 = __hydrateElement("button");
        el24.setAttribute("type", "button");
        el24.className = "secondary";
        let eventHandler14 = ((handler) => (event) => { __dirty.add("__all"); __dirtySource("onceMessage"); return handler(event); })(event.once.handler(() => {
              onceMessage = 'Clicked once';
            }));
        el24.addEventListener("click", __event((event) => eventHandler14(event)));
        el24.append("\r\n            Once\r\n          ");
        el22.append(el24);
        const el25 = __hydrateElement("button");
        el25.setAttribute("type", "button");
        let eventHandler15 = ((handler) => (event) => { __dirty.add("__all"); __dirtySource("cooldownMessage"); __dirtySource("saves"); return handler(event); })(event.cooldown(1000).handler(() => {
              cooldownMessage = `Saved at ${new Date().toLocaleTimeString()}`;
              saves++;
              event.emit(self, 'saved', {
                query,
                count: saves,
                at: new Date().toLocaleTimeString(),
              } satisfies SavedPayload);
            }));
        el25.addEventListener("click", __event((event) => eventHandler15(event)));
        el25.append("\r\n            Save\r\n          ");
        el22.append(el25);
        const el26 = __hydrateElement("p");
        const text16 = document.createTextNode("");
        el26.append(text16);
        el26.append(" / ");
        const text17 = document.createTextNode("");
        el26.append(text17);
        el22.append(el26);
        el8.append(el22);
        el0.append(el8);
        const el27 = __hydrateElement("div");
        el27.className = "keyboard";
        let eventHandler18 = ((handler) => (event) => { __dirty.add("__all"); __dirtySource("shortcut"); return handler(event); })(event.key(['Enter', 'NumpadEnter']).prevent.handler((keyboardEvent) => {
          shortcut = `Handled ${keyboardEvent.key}`;
        }));
        el27.addEventListener("keydown", __event((event) => eventHandler18(event)));
        el27.append("\r\n        Focus this box and press Enter.\r\n      ");
        el0.append(el27);
        const el28 = __hydrateElement("p");
        el28.className = "status";
        el28.append("Shortcut: ");
        const text19 = document.createTextNode("");
        el28.append(text19);
        el0.append(el28);

        return __createBlock(() => ({
          node: el0,
          update() {
          const _all = __dirty.size === 0 || __dirty.delete('__all');
          const _query = _all || __dirty.delete('query');
          if (_query) {
            __setProperty(el2, "value", query);
          }
          const _pointer = _all || __dirty.delete('pointer');
          if (_pointer) {
            __setElementText(el7, pointer);
          }
          const _delegated = _all || __dirty.delete('delegated');
          if (_delegated) {
            __setElementText(el12, delegated);
          }
          const _selfClicks = _all || __dirty.delete('selfClicks');
          if (_selfClicks) {
            __setText(text8, selfClicks);
          }
          const _childClicks = _all || __dirty.delete('childClicks');
          if (_childClicks) {
            __setText(text9, childClicks);
          }
          const _primaryClicks = _all || __dirty.delete('primaryClicks');
          if (_primaryClicks) {
            __setText(text11, primaryClicks);
          }
          const _secondaryClicks = _all || __dirty.delete('secondaryClicks');
          if (_secondaryClicks) {
            __setText(text13, secondaryClicks);
          }
          const _onceMessage = _all || __dirty.delete('onceMessage');
          if (_onceMessage) {
            __setText(text16, onceMessage);
          }
          const _cooldownMessage = _all || __dirty.delete('cooldownMessage');
          if (_cooldownMessage) {
            __setText(text17, cooldownMessage);
          }
          const _shortcut = _all || __dirty.delete('shortcut');
          if (_shortcut) {
            __setText(text19, shortcut);
          }
          if (_all) {
            eventHandler0 = ((handler) => (event) => { __dirty.add("__all"); __dirtySource("submitted"); return handler(event); })(event.prevent.if(() => query.trim() !== '' && query !== 'wow').handler(() => {
          submitted = query;
        }));
            eventHandler1 = ((handler) => (event) => { __dirty.add("__all"); __dirtySource("query"); __dirtySource("submitted"); __dirtySource("shortcut"); return handler(event); })(event.mod.key('k').prevent.handler(() => {
          query = '';
          submitted = '';
          shortcut = 'Mod+K cleared the form';
        }));
            eventHandler2 = ((handler) => (event) => { __dirty.add("__all"); __dirtySource("query"); return handler(event); })(event.input.debounce(250).handler((inputEvent) => {
            query = (inputEvent.target as HTMLInputElement).value;
          }));
            eventHandler4 = ((handler) => (event) => { __dirty.add("__all"); __dirtySource("pointer"); return handler(event); })(event.pointerMove.throttle(80).handler((pointerEvent) => {
          pointer = `${Math.round(pointerEvent.offsetX)}, ${Math.round(pointerEvent.offsetY)}`;
        }));
            eventHandler5 = ((handler) => (event) => { __dirty.add("__all"); __dirtySource("target.dataset"); __dirtySource("delegated"); return handler(event); })(event.target((target) => target instanceof HTMLButtonElement && !!target.dataset.action).stop.handler((clickEvent) => {
              const button = clickEvent.target as HTMLButtonElement;
              delegated = `Selected ${button.dataset.action}`;
            }));
            eventHandler6 = ((handler) => (event) => { __dirty.add("__all"); __dirtySource("selfClicks"); return handler(event); })(event.self.handler(() => {
              selfClicks++;
            }));
            eventHandler7 = ((handler) => (event) => { __dirty.add("__all"); __dirtySource("childClicks"); return handler(event); })(event.stop.handler(() => {
                childClicks++;
              }));
            eventHandler10 = ((handler) => (event) => { __dirty.add("__all"); __dirtySource("primaryClicks"); return handler(event); })(event.left.handler(() => {
              primaryClicks++;
            }));
            eventHandler12 = ((handler) => (event) => { __dirty.add("__all"); __dirtySource("secondaryClicks"); return handler(event); })(event.right.handler(() => {
              secondaryClicks++;
            }));
            eventHandler14 = ((handler) => (event) => { __dirty.add("__all"); __dirtySource("onceMessage"); return handler(event); })(event.once.handler(() => {
              onceMessage = 'Clicked once';
            }));
            eventHandler15 = ((handler) => (event) => { __dirty.add("__all"); __dirtySource("cooldownMessage"); __dirtySource("saves"); return handler(event); })(event.cooldown(1000).handler(() => {
              cooldownMessage = `Saved at ${new Date().toLocaleTimeString()}`;
              saves++;
              event.emit(self, 'saved', {
                query,
                count: saves,
                at: new Date().toLocaleTimeString(),
              } satisfies SavedPayload);
            }));
            eventHandler18 = ((handler) => (event) => { __dirty.add("__all"); __dirtySource("shortcut"); return handler(event); })(event.key(['Enter', 'NumpadEnter']).prevent.handler((keyboardEvent) => {
          shortcut = `Handled ${keyboardEvent.key}`;
        }));
          }
          child3 = __setChild(el4, child3, status()());
          map0.update(actions);
          __setAttribute(el27, "tabindex", 0);
          __dirty.clear();
          },
        }));
      });
}

function EventChainExample() {
  const __dirty = new Set();

  const saved: SavedPayload[] = [];

  return __componentBlock(() => {
        const el0 = __hydrateElement("main");
        el0.className = "shell event-chain-example";
        let eventHandler0 = (payload: SavedPayload) => {
        saved.unshift(payload);
      };
        el0.addEventListener("saved", __event((event) => eventHandler0((event as CustomEvent).detail)));
        let child1 = __hydrateComment("auwla:child");
        el0.append(child1);
        const el1 = __hydrateElement("aside");
        el1.className = "activity";
        const el2 = __hydrateElement("h2");
        el2.append("Emitted Saves");
        el1.append(el2);
        let child2 = __hydrateComment("auwla:child");
        el1.append(child2);
        let activeBranch3: number | null = null;
        const el3 = __hydrateElement("p");
        el3.className = "empty";
        el3.append("No saves yet");
        const map0 = __keyedMap(
          saved,
          (item) => `${item.count}-${item.at}`,
          (item, index) => __createBlock(() => {
            
            
            __trackSources(['item.query', 'item.count', 'item.at']);
            const el0 = __hydrateElement("div");
            el0.className = "entry";
            const el1 = __hydrateElement("strong");
            el0.append(el1);
            const el2 = __hydrateElement("span");
            el2.append("#");
            const text0 = document.createTextNode("");
            el2.append(text0);
            el2.append(" at ");
            const text1 = document.createTextNode("");
            el2.append(text1);
            el0.append(el2);

            __setElementText(el1, item.query || 'empty');
            __setText(text0, item.count);
            __setText(text1, item.at);


            return {
              node: el0,
              update(item, index) {
              __setElementText(el1, item.query || 'empty');
              __setText(text0, item.count);
              __setText(text1, item.at);
              },
            };
          }),
          (block, item, index) => block.update(item, index),
          (item) => [item.query, item.count, item.at],
          false,
        );
        el0.append(el1);

        return __createBlock(() => ({
          node: el0,
          update() {
          eventHandler0 = (payload: SavedPayload) => {
        saved.unshift(payload);
      };
          child1 = __setChild(el0, child1, <SearchPanel />);
          if (saved.length === 0) {
  if (activeBranch3 !== 0) { child2 = __setChild(el1, child2, el3); activeBranch3 = 0; }
} else {
  if (activeBranch3 !== 1) { child2 = __setChild(el1, child2, map0.node); activeBranch3 = 1; }
  map0.update(saved);
}
          },
        }));
      });
}

export function EventChainExampleApp() {
  return () => <EventChainExample />;
}
