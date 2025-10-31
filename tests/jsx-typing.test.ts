import { describe, test } from 'vitest'
import { h } from '../src/jsx'
import { ref, type Ref } from '../src/state'

// This file contains type-only assertions; tests do not run logic.

describe('JSX typing assertions', () => {
  test('props and events typing', () => {
    // className accepts string or Ref<string>
    h('div', { className: 'ok' })
    const cn: Ref<string> = ref('x')
    h('div', { className: cn })
   
    // @ts-expect-error className must be string or Ref<string>
    h('div', { className: 123 })

    // style accepts string, object, or Ref<...>
    h('div', { style: 'color:red' })
    h('div', { style: { color: 'red' } })
    const st = ref({ color: 'blue' })
    h('div', { style: st })

    // Events typed
    h('button', { onClick: (e: MouseEvent) => void e })
    // @ts-expect-error onClick expects MouseEvent, not KeyboardEvent
    h('button', { onClick: (e: KeyboardEvent) => void e })
    h('input', { onInput: (e: InputEvent) => void e })

    // Input props
    h('input', { type: 'text', value: 'hello' })
    h('input', { type: 'number', value: 123 })
    h('input', { checked: ref(true) })
    // @ts-expect-error checked must be boolean or Ref<boolean>
    h('input', { checked: 'yes' })
    // @ts-expect-error value must be string | number | Ref<string | number>
    h('input', { value: { x: 1 } })

    // Anchor props
    h('a', { href: 'https://example.com', target: '_blank', rel: 'noopener' })
    // @ts-expect-error href must be string or Ref<string>
    h('a', { href: 123 })

    // Ref typing
    h('button', { ref: (el: HTMLButtonElement) => {} })
    // Generic HTMLElement allowed
    h('div', { ref: (el: HTMLElement) => {} })
  })
})