import type { Ref } from "./state";

type HTMLTags = 
  | 'div' | 'span' | 'p' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
  | 'a' | 'img' | 'ul' | 'ol' | 'li' | 'table' | 'tr' | 'td' | 'th'
  | 'form' | 'label' | 'select' | 'option' | 'textarea'
  | 'header' | 'footer' | 'nav' | 'main' | 'section' | 'article' | 'aside'
  | 'button' | 'input' | 'strong' | 'em' | 'b' | 'i' | 'u' | 'small'
  | 'code' | 'pre' | 'blockquote' | 'hr' | 'br';

type TagToElement = {
    'div': HTMLDivElement;
    'span': HTMLSpanElement;
    'p': HTMLParagraphElement;
    'h1': HTMLHeadingElement;
    'h2': HTMLHeadingElement;
    'h3': HTMLHeadingElement;
    'h4': HTMLHeadingElement;
    'h5': HTMLHeadingElement;
    'h6': HTMLHeadingElement;
    'a': HTMLAnchorElement;
    'img': HTMLImageElement;
    'ul': HTMLUListElement;
    'ol': HTMLOListElement;
    'li': HTMLLIElement;
    'table': HTMLTableElement;
    'tr': HTMLTableRowElement;
    'td': HTMLTableCellElement;
    'th': HTMLTableCellElement;
    'form': HTMLFormElement;
    'label': HTMLLabelElement;
    'select': HTMLSelectElement;
    'option': HTMLOptionElement;
    'textarea': HTMLTextAreaElement;
    'header': HTMLElement;
    'footer': HTMLElement;
    'nav': HTMLElement;
    'main': HTMLElement;
    'section': HTMLElement;
    'article': HTMLElement;
    'aside': HTMLElement;
    'button': HTMLButtonElement;
    'input': HTMLInputElement;
    'strong': HTMLElement;
    'em': HTMLElement;
    'b': HTMLElement;
    'i': HTMLElement;
    'u': HTMLElement;
    'small': HTMLElement;
    'code': HTMLElement;
    'pre': HTMLPreElement;
    'blockquote': HTMLQuoteElement;
    'hr': HTMLHRElement;
    'br': HTMLBRElement;
};

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

export function el<K extends HTMLTags>(tag: K): ElementBuilder<TagToElement[K]> {
    const element = document.createElement(tag);    
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
