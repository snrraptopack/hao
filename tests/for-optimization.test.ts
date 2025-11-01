import { describe, it, expect, vi } from 'vitest'
import { ref } from '../src/state'
import { For } from '../src/jsxutils'

describe('For Component - Optimization', () => {
  it('should reuse nodes when item references are unchanged', async () => {
    const items = ref([
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' },
      { id: 3, name: 'Charlie' }
    ])
    
    const renderFn = vi.fn((item: { id: number; name: string }) => {
      const div = document.createElement('div')
      div.textContent = item.name
      div.setAttribute('data-id', String(item.id))
      return div
    })
    
    const forComponent = For({
      each: items,
      key: (item) => item.id,
      render: renderFn
    })
    
    document.body.appendChild(forComponent)
    
    // Initial render - should call renderFn 3 times
    expect(renderFn).toHaveBeenCalledTimes(3)
    
    // Capture the initial DOM nodes
    const initialDivs = Array.from(forComponent.querySelectorAll('div'))
    expect(initialDivs).toHaveLength(3)
    
    // Update one item immutably (only item 2 gets new reference)
    renderFn.mockClear()
    items.value = items.value.map(item => 
      item.id === 2 ? { ...item, name: 'Robert' } : item
    )
    
    // Wait for reactivity to complete
    await new Promise(resolve => setTimeout(resolve, 0))
    
    // Should only re-render the changed item (item 2)
    expect(renderFn).toHaveBeenCalledTimes(1)
    expect(renderFn).toHaveBeenCalledWith(
      { id: 2, name: 'Robert' },
      1
    )
    
    // Verify DOM shows updated value
    const updatedDivs = Array.from(forComponent.querySelectorAll('div'))
    expect(updatedDivs[0].textContent).toBe('Alice')
    expect(updatedDivs[1].textContent).toBe('Robert')
    expect(updatedDivs[2].textContent).toBe('Charlie')
    
    // CRITICAL: Verify nodes were reused (same object reference)
    expect(updatedDivs[0]).toBe(initialDivs[0]) // Alice node reused
    expect(updatedDivs[1]).not.toBe(initialDivs[1]) // Bob node replaced with Robert node
    expect(updatedDivs[2]).toBe(initialDivs[2]) // Charlie node reused
  })
  
  it('should handle primitives with value equality', async () => {
    const numbers = ref([1, 2, 3, 4, 5])
    
    const renderFn = vi.fn((num: number) => {
      const span = document.createElement('span')
      span.textContent = String(num)
      return span
    })
    
    const forComponent = For({
      each: numbers,
      render: renderFn
    })
    
    document.body.appendChild(forComponent)
    
    // Initial render
    expect(renderFn).toHaveBeenCalledTimes(5)
    
    // Capture initial nodes
    const initialSpans = Array.from(forComponent.querySelectorAll('span'))
    expect(initialSpans).toHaveLength(5)
    
    // Update one number
    renderFn.mockClear()
    numbers.value = numbers.value.map((n, i) => i === 2 ? 999 : n)
    
    // Wait for reactivity
    await new Promise(resolve => setTimeout(resolve, 0))
    
    // Should only re-render the changed item
    expect(renderFn).toHaveBeenCalledTimes(1)
    expect(renderFn).toHaveBeenCalledWith(999, 2)
    
    // Verify DOM and node reuse
    const updatedSpans = Array.from(forComponent.querySelectorAll('span'))
    expect(updatedSpans[0].textContent).toBe('1')
    expect(updatedSpans[1].textContent).toBe('2')
    expect(updatedSpans[2].textContent).toBe('999')
    expect(updatedSpans[3].textContent).toBe('4')
    expect(updatedSpans[4].textContent).toBe('5')
    
    // Verify node reuse (primitives with unchanged values)
    expect(updatedSpans[0]).toBe(initialSpans[0]) // 1 unchanged
    expect(updatedSpans[1]).toBe(initialSpans[1]) // 2 unchanged
    expect(updatedSpans[2]).not.toBe(initialSpans[2]) // 3 -> 999 changed
    expect(updatedSpans[3]).toBe(initialSpans[3]) // 4 unchanged
    expect(updatedSpans[4]).toBe(initialSpans[4]) // 5 unchanged
  })
  
  it('should re-render all items when all references change', async () => {
    const items = ref([
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' }
    ])
    
    const renderFn = vi.fn((item: { id: number; name: string }) => {
      const div = document.createElement('div')
      div.textContent = item.name
      return div
    })
    
    const forComponent = For({
      each: items,
      key: (item) => item.id,
      render: renderFn
    })
    
    document.body.appendChild(forComponent)
    
    expect(renderFn).toHaveBeenCalledTimes(2)
    
    // Capture initial nodes
    const initialDivs = Array.from(forComponent.querySelectorAll('div'))
    
    // Update all items (all new references)
    renderFn.mockClear()
    items.value = items.value.map(item => ({ ...item, name: item.name.toUpperCase() }))
    
    // Wait for reactivity
    await new Promise(resolve => setTimeout(resolve, 0))
    
    // Should re-render both items
    expect(renderFn).toHaveBeenCalledTimes(2)
    
    // Verify DOM
    const updatedDivs = Array.from(forComponent.querySelectorAll('div'))
    expect(updatedDivs[0].textContent).toBe('ALICE')
    expect(updatedDivs[1].textContent).toBe('BOB')
    
    // Verify all nodes were replaced (all references changed)
    expect(updatedDivs[0]).not.toBe(initialDivs[0])
    expect(updatedDivs[1]).not.toBe(initialDivs[1])
  })
})
