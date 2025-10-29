import { h } from 'auwla'
import { CodeBlock } from '../../components/CodeBlock'

export function DocsTemplateSyntax() {
  return (
    <section class="docs-prose">
      <h1>Template Syntax</h1>
      <p>Use JSX to describe UI: elements, attributes, composition, fragments, and events. This section focuses on templates only — no state or reactivity.</p>

      <h2>Basics</h2>
      <p>JSX compiles to <code>h()</code> calls. Import <code>h</code> in TSX files.</p>
      <CodeBlock language="tsx" filename="Basic.tsx" code={`import { h } from 'auwla'

export function Basic() {
  return (
    <div class="card">
      <h1>Title</h1>
      <p>Text and expressions</p>
    </div>
  ) as HTMLElement
}
`} />

      <h2>Attributes</h2>
      <ul class="list-disc pl-6">
        <li>Use <code>class</code> (or <code>className</code>); both are supported.</li>
        <li><code>style</code> accepts a string or an object with CSS properties.</li>
        <li>Event handlers follow DOM naming (e.g., <code>onClick</code>).</li>
      </ul>
      <CodeBlock language="tsx" filename="Attributes.tsx" code={`import { h } from 'auwla'

export function Attributes() {
  return (
    <button
      class="btn primary"
      style={{ padding: '8px', backgroundColor: '#f9fafb' }}
      onClick={() => alert('clicked')}
    >
      Click me
    </button>
  ) as HTMLElement
}
`} />

      <h2>Expressions & Interpolation</h2>
      <p>Embed JavaScript expressions with curly braces inside JSX.</p>
      <CodeBlock language="tsx" filename="Expressions.tsx" code={`import { h } from 'auwla'

export function Expressions() {
  const user = { name: 'Ada', count: 3 }
  return (
    <p>
      Hello {user.name}, you have {user.count} messages.
    </p>
  ) as HTMLElement
}
`} />

      <h2>Composition</h2>
      <p>Write small, plain functions and compose them. Type props with block declarations.</p>
      <CodeBlock language="tsx" filename="Composition.tsx" code={`import { h } from 'auwla'

type HeaderProps = {
  title: string
}
function Header(props: HeaderProps) {
  return (
    <header>
      <h1>{props.title}</h1>
    </header>
  ) as HTMLElement
}

type CardProps = {
  title: string
  body: string
}
function Card(p: CardProps) {
  return (
    <section>
      <h2>{p.title}</h2>
      <p>{p.body}</p>
    </section>
  ) as HTMLElement
}

export function App() {
  return (
    <div>
      <Header title="Template Syntax" />
      <Card title="Composition" body="Keep components small and focused." />
    </div>
  ) as HTMLElement
}
`} />

      <h2>Children</h2>
      <p>
        Function components receive children through <code>props.children</code>. Children are
        normalized to an array; a single child becomes an array of one. Strings, numbers,
        nodes, and arrays are supported; <code>null</code>, <code>undefined</code>, and booleans
        are ignored.
      </p>
      <CodeBlock language="tsx" filename="Children.tsx" code={`import { h } from 'auwla'

type AnyProps = {
  children?: (Node | string | number)[]
}
function Any(p: AnyProps) {
  return (
    <div class="wrapper">{p.children}</div>
  ) as HTMLElement
}

export function Demo() {
  return (
    <section>
      <Any>How are you</Any>
      <Any>
        <strong>Bold</strong> text
      </Any>
      <Any>{['A', 'B', 'C'].map((x) => <span>{x}</span>)}</Any>
    </section>
  ) as HTMLElement
}
`} />
      <ul class="list-disc pl-6">
        <li>
          Classic runtime: <code>&lt;Any&gt;child&lt;/Any&gt;</code> compiles to
          <code>h(Any, null, 'child')</code>, passed as <code>props.children</code>.
        </li>
        <li>
          Automatic runtime: the compiler sets <code>props.children</code> and delegates to
          <code>h</code>; access <code>props.children</code> the same way.
        </li>
        <li>
          TypeScript: the <code>children</code> property name is standard via
          <code>ElementChildrenAttribute</code>.
        </li>
      </ul>

      <h2>Fragments</h2>
      <p>Use fragments to group sibling elements without an extra wrapper.</p>
      <CodeBlock language="tsx" filename="Fragments.tsx" code={`import { h, Fragment } from 'auwla'

export function List() {
  const items = ['One', 'Two']
  return (
    <ul>
      <Fragment>
        {items.map((x) => <li>{x}</li>)}
      </Fragment>
    </ul>
  ) as HTMLElement
}
`} />

      <h2>Conditionals & Lists</h2>
      <p>Use standard JavaScript in templates: ternaries and <code>map()</code> for lists.</p>
      <CodeBlock language="tsx" filename="ConditionalsLists.tsx" code={`import { h } from 'auwla'

export function ConditionalsLists() {
  const show = true
  const items = ['A', 'B', 'C']
  return (
    <div>
      {show ? <p>Visible</p> : null}
      <ul>{items.map((i) => <li>{i}</li>)}</ul>
    </div>
  ) as HTMLElement
}
`} />
    </section>
  ) as HTMLElement
}