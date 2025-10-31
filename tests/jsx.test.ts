import { describe, test, expect } from 'vitest'
import { h } from '../src/jsx'
import { ref, flush } from '../src/state'

describe('jsx runtime', () => {
  test('renders reactive text', async () => {
    const count = ref(0)
    const button = h('button', null, count)
    const root = document.createElement('div')
    root.appendChild(button)

    expect(root.textContent).toContain('0')
    count.value = 1
    await flush()
    expect(root.textContent).toContain('1')
  })

  test('renders ref of Node between markers', async () => {
    const tmpl = (t: string) => {
      const span = document.createElement('span')
      span.textContent = t
      return span
    }
    const child = ref<HTMLElement | null>(tmpl('A'))
    const div = h('div', null, child)
    const root = document.createElement('div')
    root.appendChild(div)
    expect(root.querySelector('span')!.textContent).toBe('A')

    child.value = tmpl('B')
    await flush()
    expect(root.querySelector('span')!.textContent).toBe('B')
  })
})