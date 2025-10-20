import { Ref } from './state'

declare global {
  namespace JSX {
    interface Element extends HTMLElement {}
    
    interface IntrinsicElements {
      div: JSXProps
      span: JSXProps
      p: JSXProps
      h1: JSXProps
      h2: JSXProps
      h3: JSXProps
      h4: JSXProps
      h5: JSXProps
      h6: JSXProps
      button: JSXProps & { 
        onClick?: () => void 
        type?: 'button' | 'submit' | 'reset'
      }
      input: JSXProps & { 
        type?: string
        value?: string | Ref<string>
        checked?: boolean | Ref<boolean>
        placeholder?: string
        onChange?: (e: Event) => void
        onInput?: (e: Event) => void
      }
      a: JSXProps & { 
        href?: string 
        target?: string
      }
      img: JSXProps & { 
        src?: string
        alt?: string 
        width?: number | string
        height?: number | string
      }
      ul: JSXProps
      ol: JSXProps
      li: JSXProps
      form: JSXProps & { 
        onSubmit?: (e: Event) => void 
      }
      label: JSXProps & {
        htmlFor?: string
      }
      select: JSXProps & {
        value?: string | Ref<string>
        onChange?: (e: Event) => void
      }
      option: JSXProps & { 
        value?: string 
        selected?: boolean
      }
      textarea: JSXProps & {
        value?: string | Ref<string>
        placeholder?: string
        rows?: number
        cols?: number
        onChange?: (e: Event) => void
        onInput?: (e: Event) => void
      }
      // Semantic HTML elements
      header: JSXProps
      footer: JSXProps
      nav: JSXProps
      main: JSXProps
      section: JSXProps
      article: JSXProps
      aside: JSXProps
    }

    interface ElementChildrenAttribute {
      children: {}
    }
  }
}

interface JSXProps {
  className?: string
  id?: string
  style?: string | Record<string, string>
  children?: any
  key?: string | number
  
  // Common event handlers
  onClick?: (e: MouseEvent) => void
  onMouseOver?: (e: MouseEvent) => void
  onMouseOut?: (e: MouseEvent) => void
  onFocus?: (e: FocusEvent) => void
  onBlur?: (e: FocusEvent) => void
  onKeyDown?: (e: KeyboardEvent) => void
  onKeyUp?: (e: KeyboardEvent) => void
}

export {}