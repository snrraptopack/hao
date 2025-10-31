import { describe, test, expect } from 'vitest'
import { pathFor } from '../src/routes'

describe('typed routing helpers', () => {
  test('pathFor replaces params and appends query', () => {
    const url = pathFor('/users/:id', { id: 42 }, { tab: 'posts', page: 2 })
    expect(url).toBe('/users/42?tab=posts&page=2')
  })

  test('pathFor handles no query', () => {
    const url = pathFor('/products/:sku', { sku: 'abc-123' })
    expect(url).toBe('/products/abc-123')
  })
})