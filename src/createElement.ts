import type { Ref } from "./state";

export type EventMap = {
    'click': MouseEvent;
    'input': InputEvent;
    'change': Event;
    'submit': SubmitEvent;
    'focus': FocusEvent;
    'blur': FocusEvent;
    "keydown":KeyboardEvent
}

export type EventHandlers = Partial<{
    [K in keyof EventMap]: (event: EventMap[K]) => void;
}>;

interface ElementBuilder<T extends HTMLElement>{
    element:T
    withClass(className: string): ElementBuilder<T>;
    withText<V>(ref:Ref<V>,formatter?:(v:V)=> string):ElementBuilder<T>
    withText(text: string): ElementBuilder<T>;
    withId(id: string): ElementBuilder<T>;
    appendChild(...children:HTMLElement[]):ElementBuilder<T>
    on<K extends keyof EventMap>(eventName:K,handler:(event:EventMap[K])=>void):ElementBuilder<T>;
    build(): T;
}

/**
 * Low-level DOM element builder used by Auwla's JSX runtime.
 * Prefer JSX in app code; `el()` exists for internal composition and advanced cases.
 * 
 * Example (builder):
 * ```ts
 * const button = el('button')
 *   .withClass('px-2 py-1 border rounded')
 *   .withText('Click')
 *   .on('click', () => alert('Hi'))
 *   .build()
 * document.body.appendChild(button)
 * ```
 */
export function el<K extends keyof HTMLElementTagNameMap>(tag: K): ElementBuilder<HTMLElementTagNameMap[K]> {
    const element = document.createElement(tag) as HTMLElementTagNameMap[K];    
    return {
        element,
        withClass(className: string) {
            element.className = className;
            return this;
        },
        withText(input: string | Ref<any>, formatter?: (v: any) => string) {
            if (input && typeof input === 'object') {
                // It's a Ref - subscribe to changes
                const ref = input as Ref<any>;
                const getText = (v: any) => formatter ? formatter(v) : String(v.value);
        
                this.element.textContent = getText(ref.value);
                ref.subscribe(() => {
                    this.element.textContent = getText(ref.value);
                });
            } else {
                this.element.textContent = String(input);
            }
        return this;
},
        withId(id: string) {
            element.id = id;
            return this;
        },
        appendChild(...children:HTMLElement[]){
            children.forEach(child=> element.appendChild(child))
            return this
        },
        on<K extends keyof EventMap>(eventName:K,handler:(event:EventMap[K])=>void){
            element.addEventListener(eventName,handler as EventListener)
            return this
        },
        build() {
            return this.element;
        }
    };
}
