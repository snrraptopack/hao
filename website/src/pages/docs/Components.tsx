import { h } from 'auwla'
import { CodeBlock } from '../../components/CodeBlock'

export function DocsComponents() {
  return (
    <section class="docs-prose">
      <h1>Components</h1>
      <p>
        Components are plain functions that return elements. Keep props simple, place children
        explicitly, and favor named slots when you have multiple content areas.
      </p>

      <h2>Basics</h2>
      <p>Write small functions that accept props and return JSX. Import <code>h</code> in TSX files.</p>
      <CodeBlock language="tsx" filename="Button.tsx" code={`import { h } from 'auwla'

type ButtonProps = {
  kind?: 'primary' | 'ghost'
  children?: (Node | string | number)[]
}
export function Button({ kind = 'primary', children = [] }: ButtonProps) {
  const cls = kind === 'primary'
    ? 'px-3 py-2 rounded bg-indigo-600 text-white'
    : 'px-3 py-2 rounded border text-gray-900'
  return (
    <button class={cls}>{children}</button>
  ) as HTMLElement
}

export function Demo() {
  return (
    <div class="space-x-2">
      <Button>Save</Button>
      <Button kind="ghost">Cancel</Button>
    </div>
  ) as HTMLElement
}
`} />

      <h2>Children</h2>
      <p>
        Children are passed via <code>props.children</code> and normalized to an array. Nothing is
        auto-inserted: if a component doesn’t render <code>children</code>, nested content is dropped.
        Place children deliberately to avoid implicit composition surprises.
      </p>
      <CodeBlock language="tsx" filename="Card.tsx" code={`import { h } from 'auwla'

type CardProps = {
  title: string
  children?: (Node | string | number)[]
}
export function Card({ title, children = [] }: CardProps) {
  return (
    <section class="rounded border p-4 space-y-2">
      <h2 class="font-semibold">{title}</h2>
      <div>{children}</div>
    </section>
  ) as HTMLElement
}

export function UseCard() {
  return (
    <Card title="Hello">
      <p>How are you?</p>
    </Card>
  ) as HTMLElement
}
`} />
      <ul class="list-disc pl-6">
        <li>Classic runtime: <code>&lt;Card&gt;child&lt;/Card&gt;</code> compiles to <code>h(Card, null, 'child')</code>.</li>
        <li>Automatic runtime: the compiler sets <code>props.children</code> and delegates to <code>h</code>.</li>
        <li>TypeScript standardizes the <code>children</code> property via <code>ElementChildrenAttribute</code>.</li>
      </ul>

      <h2>Named Slots</h2>
      <p>
        Use named props for multiple regions (header, actions, footer). This removes ambiguity and
        keeps layout explicit.
      </p>
      <CodeBlock language="tsx" filename="CardSlots.tsx" code={`import { h } from 'auwla'

type Slots = Node | string | number | undefined
type CardProps = {
  title?: string
  header?: Slots
  actions?: Slots
  children?: (Node | string | number)[]
  footer?: Slots
}
export function Card({ title, header, actions, children = [], footer }: CardProps) {
  return (
    <section class="rounded border p-4 space-y-3">
      <div class="flex items-center justify-between">
        <div class="font-semibold">{header ?? title}</div>
        <div class="flex gap-2">{actions}</div>
      </div>
      <div>{children}</div>
      {footer ? <div class="text-sm text-gray-600">{footer}</div> : null}
    </section>
  ) as HTMLElement
}

export function Example() {
  return (
    <Card
      header={<span>Profile</span>}
      actions={<button class="px-2 py-1 border rounded">Edit</button>}
      footer="Last updated today"
    >
      <p>Content goes here.</p>
    </Card>
  ) as HTMLElement
}
`} />

      <h2>Prop Typing</h2>
      <p>Use block prop types for readability and better error messages.</p>
      <CodeBlock language="tsx" filename="Avatar.tsx" code={`import { h } from 'auwla'

type AvatarProps = {
  src: string
  alt?: string
  size?: number
}
export function Avatar(p: AvatarProps) {
  const s = p.size ?? 32
  return (
    <img
      src={p.src}
      alt={p.alt ?? ''}
      style={{ width: s + 'px', height: s + 'px', borderRadius: '9999px' }}
    />
  ) as HTMLElement
}
`} />

      <h2>Composition Patterns</h2>
      <ul class="list-disc pl-6">
        <li>Children: one content area meant for freeform markup.</li>
        <li>Named slots: multiple regions with clear placement.</li>
        <li>Data props: pass non-UI values via named props (not children).</li>
      </ul>

      <h2>Notes</h2>
      <ul class="list-disc pl-6">
        <li>Import <code>h</code> in TSX files when using the classic JSX factory.</li>
        <li>Children are an array; <code>null</code>, <code>undefined</code>, and booleans are ignored.</li>
        <li>Be explicit: render <code>children</code> where you want it to appear.</li>
      </ul>
    </section>
  ) as HTMLElement
}