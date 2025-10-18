/**
 * Auwla Framework Type Definitions
 * Provides IntelliSense and type safety for .auwla files
 */

declare module 'auwla' {
  /**
   * Create a reactive reference
   * @param value Initial value
   * @returns Reactive reference object with .value property
   * @example
   * const count = ref(0)
   * count.value++ // Updates reactively
   */
  export function ref<T>(value: T): { value: T }

  /**
   * Watch reactive dependencies and run a callback when they change
   * @param deps Array of reactive references to watch
   * @param callback Function to run when dependencies change
   * @returns Cleanup function
   * @example
   * watch([count], () => console.log('Count changed:', count.value))
   */
  export function watch<T = any>(
    deps: Array<{ value: any }>,
    callback: () => T
  ): T

  /**
   * Create an Auwla component
   * @param builder Function that receives UI builder and returns component structure
   * @returns Component instance
   * @example
   * export default Component((ui) => {
   *   ui.Div({}, (ui) => {
   *     ui.H1({ text: 'Hello World' })
   *   })
   * })
   */
  export function Component(builder: (ui: UIBuilder) => void): any

  /**
   * UI Builder interface - provides methods to create UI elements
   */
  export interface UIBuilder {
    // Container elements
    Div(config?: ElementConfig, children?: (ui: UIBuilder) => void): void
    Span(config?: ElementConfig, children?: (ui: UIBuilder) => void): void
    Section(config?: ElementConfig, children?: (ui: UIBuilder) => void): void
    Article(config?: ElementConfig, children?: (ui: UIBuilder) => void): void
    Header(config?: ElementConfig, children?: (ui: UIBuilder) => void): void
    Footer(config?: ElementConfig, children?: (ui: UIBuilder) => void): void
    Main(config?: ElementConfig, children?: (ui: UIBuilder) => void): void
    Nav(config?: ElementConfig, children?: (ui: UIBuilder) => void): void
    Aside(config?: ElementConfig, children?: (ui: UIBuilder) => void): void

    // Text elements
    H1(config?: ElementConfig, children?: (ui: UIBuilder) => void): void
    H2(config?: ElementConfig, children?: (ui: UIBuilder) => void): void
    H3(config?: ElementConfig, children?: (ui: UIBuilder) => void): void
    H4(config?: ElementConfig, children?: (ui: UIBuilder) => void): void
    H5(config?: ElementConfig, children?: (ui: UIBuilder) => void): void
    H6(config?: ElementConfig, children?: (ui: UIBuilder) => void): void
    P(config?: ElementConfig, children?: (ui: UIBuilder) => void): void
    A(config?: ElementConfig, children?: (ui: UIBuilder) => void): void
    Strong(config?: ElementConfig, children?: (ui: UIBuilder) => void): void
    Em(config?: ElementConfig, children?: (ui: UIBuilder) => void): void
    Code(config?: ElementConfig, children?: (ui: UIBuilder) => void): void
    Pre(config?: ElementConfig, children?: (ui: UIBuilder) => void): void

    // List elements
    Ul(config?: ElementConfig, children?: (ui: UIBuilder) => void): void
    Ol(config?: ElementConfig, children?: (ui: UIBuilder) => void): void
    Li(config?: ElementConfig, children?: (ui: UIBuilder) => void): void

    // Form elements
    Form(config?: ElementConfig, children?: (ui: UIBuilder) => void): void
    Input(config?: InputConfig): void
    Textarea(config?: ElementConfig, children?: (ui: UIBuilder) => void): void
    Button(config?: ElementConfig, children?: (ui: UIBuilder) => void): void
    Label(config?: ElementConfig, children?: (ui: UIBuilder) => void): void
    Select(config?: ElementConfig, children?: (ui: UIBuilder) => void): void
    Option(config?: ElementConfig, children?: (ui: UIBuilder) => void): void

    // Media elements
    Img(config?: ImgConfig): void
    Video(config?: ElementConfig, children?: (ui: UIBuilder) => void): void
    Audio(config?: ElementConfig, children?: (ui: UIBuilder) => void): void
    Canvas(config?: ElementConfig): void
    Svg(config?: ElementConfig, children?: (ui: UIBuilder) => void): void

    // Table elements
    Table(config?: ElementConfig, children?: (ui: UIBuilder) => void): void
    Thead(config?: ElementConfig, children?: (ui: UIBuilder) => void): void
    Tbody(config?: ElementConfig, children?: (ui: UIBuilder) => void): void
    Tfoot(config?: ElementConfig, children?: (ui: UIBuilder) => void): void
    Tr(config?: ElementConfig, children?: (ui: UIBuilder) => void): void
    Th(config?: ElementConfig, children?: (ui: UIBuilder) => void): void
    Td(config?: ElementConfig, children?: (ui: UIBuilder) => void): void

    // Control flow
    /**
     * Conditional rendering
     * @param condition Reactive condition or static boolean
     * @param builder Function that builds UI when condition is true
     * @example
     * ui.When(watch([count], () => count.value > 5), (ui) => {
     *   ui.P({ text: 'Count is greater than 5!' })
     * })
     */
    When(condition: boolean | any, builder: (ui: UIBuilder) => void): void

    /**
     * List rendering with reactive updates
     * @param config List configuration with items, key function, and render function
     * @example
     * ui.List({
     *   items: todos.value,
     *   key: (todo) => todo.id,
     *   render: (todo, index, ui) => {
     *     ui.Li({ text: todo.text })
     *   }
     * })
     */
    List<T>(config: ListConfig<T>): void

    // Text
    Text(config: { value: string | (() => string) }): void
  }

  /**
   * Configuration object for HTML elements
   */
  export interface ElementConfig {
    /** Element class name(s) */
    className?: string
    /** Element ID */
    id?: string
    /** Inline styles */
    style?: string | Record<string, string>
    /** Text content (for text-only elements) */
    text?: string | (() => string)
    /** Event handlers */
    on?: {
      click?: (event: MouseEvent) => void
      input?: (event: InputEvent) => void
      change?: (event: Event) => void
      submit?: (event: SubmitEvent) => void
      focus?: (event: FocusEvent) => void
      blur?: (event: FocusEvent) => void
      keydown?: (event: KeyboardEvent) => void
      keyup?: (event: KeyboardEvent) => void
      mouseenter?: (event: MouseEvent) => void
      mouseleave?: (event: MouseEvent) => void
      [key: string]: ((event: Event) => void) | undefined
    }
    /** Reactive value binding (for inputs) */
    value?: { value: any }
    /** HTML attributes */
    [key: string]: any
  }

  /**
   * Input element configuration
   */
  export interface InputConfig extends ElementConfig {
    type?: 'text' | 'number' | 'email' | 'password' | 'checkbox' | 'radio' | 'file' | 'date' | 'time'
    placeholder?: string
    checked?: boolean | { value: boolean }
    disabled?: boolean
    required?: boolean
    min?: number | string
    max?: number | string
    step?: number | string
  }

  /**
   * Image element configuration
   */
  export interface ImgConfig extends ElementConfig {
    src: string
    alt?: string
    width?: number | string
    height?: number | string
    loading?: 'lazy' | 'eager'
  }

  /**
   * List configuration for ui.List()
   */
  export interface ListConfig<T> {
    /** Array of items to render */
    items: T[]
    /** Function to extract unique key from each item */
    key: (item: T, index?: number) => string | number
    /** Function to render each item */
    render: (item: T, index: number, ui: UIBuilder) => void
  }
}

declare module 'auwla/template' {
  /**
   * Conditional rendering in JSX expressions
   * Import as: import { if as $if } from 'auwla/template'
   * @param condition Boolean condition or reactive expression
   * @param builder Function returning JSX element
   * @returns Conditional JSX element
   * @example
   * {$if(count.value > 5, () => (
   *   <p>Count is greater than 5!</p>
   * ))}
   */
  export { $if as if }
  export function $if<T>(
    condition: boolean | (() => boolean),
    builder: () => T
  ): T | null

  /**
   * List rendering in JSX expressions
   * Import as: import { each as $each } from 'auwla/template'
   * @param items Array of items to render
   * @param builder Function that renders each item
   * @returns Array of JSX elements
   * @example
   * {$each(todos.value, (todo) => (
   *   <li key={todo.id}>{todo.text}</li>
   * ))}
   */
  export { $each as each }
  export function $each<T, R>(
    items: T[],
    builder: (item: T, index?: number) => R
  ): R[]
}
