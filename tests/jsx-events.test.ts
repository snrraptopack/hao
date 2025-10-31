import { describe, test, expect } from 'vitest'
import { h } from '../src/jsx'

describe('JSX events and refs runtime', () => {
  test('onClick receives MouseEvent', () => {
    let received: Event | null = null
    const btn = h('button', { onClick: (e: MouseEvent) => { received = e } }, 'Click') as HTMLElement
    const root = document.createElement('div')
    root.appendChild(btn)
    btn.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(received).toBeInstanceOf(MouseEvent)
  })

  test('onKeydown receives KeyboardEvent', () => {
    let received: Event | null = null
    const input = h('input', { onKeydown: (e: KeyboardEvent) => { received = e } }) as HTMLElement
    const root = document.createElement('div')
    root.appendChild(input)
    input.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Enter' }))
    expect(received).toBeInstanceOf(KeyboardEvent)
  })

  test('onInput receives InputEvent', () => {
    let received: Event | null = null
    const input = h('input', { onInput: (e: InputEvent) => { received = e } }) as HTMLElement
    const root = document.createElement('div')
    root.appendChild(input)
    input.dispatchEvent(new InputEvent('input', { bubbles: true }))
    expect(received).toBeInstanceOf(InputEvent)
  })

  test('ref callback receives HTMLElement', () => {
    let el: HTMLElement | null = null
    const btn = h('button', { ref: (e: HTMLButtonElement) => { el = e } }, 'Click') as HTMLElement
    const root = document.createElement('div')
    root.appendChild(btn)
    expect(el).toBeInstanceOf(HTMLElement)
  })
})