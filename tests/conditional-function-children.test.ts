import { describe, it, expect } from 'vitest'
import { h } from '../src/jsx'
import { ref } from '../src/state'

describe('Function children conditional rendering', () => {
  it('renders lazily and re-evaluates on dependency change', async () => {
    const count = ref(0)
    let calls = 0
    const root = h('div', null,
      () => {
        calls++
        if (count.value > 0) {
          return h('span', null, 'Greater')
        } else {
          return h('span', null, 'Lesser')
        }
      }
    ) as HTMLElement

    document.body.appendChild(root)
    expect(root.textContent).toContain('Lesser')
    expect(calls).toBe(1)

    count.value = 1
    await Promise.resolve()
    expect(root.textContent).toContain('Greater')
    expect(calls).toBe(2)
  })

  it('supports keyed arrays with stable node reuse and reordering', async () => {
    const items = ref([
      { id: 1, name: 'A' },
      { id: 2, name: 'B' },
      { id: 3, name: 'C' }
    ])

    const root = h('ul', null,
      () => items.value.map(item => h('li', { key: item.id }, item.name))
    ) as HTMLElement

    document.body.appendChild(root)

    const initialNodes = Array.from(root.querySelectorAll('li'))
    expect(initialNodes.map(n => n.textContent)).toEqual(['A', 'B', 'C'])

    items.value = [
      { id: 3, name: 'C' },
      { id: 1, name: 'A' },
      { id: 2, name: 'B' }
    ]
    await Promise.resolve()

    const reordered = Array.from(root.querySelectorAll('li'))
    expect(reordered.map(n => n.textContent)).toEqual(['C', 'A', 'B'])

    // Node identity for existing keys should be preserved (moved, not replaced)
    // Compare by object reference
    expect(reordered[1]).toBe(initialNodes[0])
    expect(reordered[2]).toBe(initialNodes[1])
  })
})

