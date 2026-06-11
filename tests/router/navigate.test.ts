/**
 * @fileoverview Tests for the navigate() params interpolation runtime behaviour.
 *
 * These tests verify that navigate() correctly:
 *   - Passes plain paths through unchanged.
 *   - Interpolates :param segments when a params object is provided.
 *   - Handles NavigateOptions (replace) correctly in both param and no-param cases.
 *   - Distinguishes between params and options objects at runtime.
 *
 * Type-safety (Register interface enforcement) is a compile-time concern and
 * is therefore not tested here — those are TypeScript errors, not runtime errors.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Minimal browser environment shims
// ---------------------------------------------------------------------------

// Vitest's jsdom gives us window and history, but not window.navigation.
// We delete it here so our tests always exercise the History API fallback.
beforeEach(() => {
  // @ts-expect-error — force fallback path
  delete (window as any).navigation

  // Reset location to '/'
  history.replaceState(null, '', '/')
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Dynamically import navigate so each test gets a fresh module state.
 * We re-import per test to avoid cross-test pollution from the module-level
 * reactive cell and _initialized flag.
 */
async function getNavigate() {
  const mod = await import('../../src/router/navigation')
  return mod.navigate
}

// ---------------------------------------------------------------------------
// navigate() — runtime params interpolation
// ---------------------------------------------------------------------------

describe('navigate() params interpolation', () => {
  it('navigates to a plain path without params', async () => {
    const navigate = await getNavigate()
    const push = vi.spyOn(history, 'pushState')

    navigate('/about')

    expect(push).toHaveBeenCalledWith(null, '', '/about')
    push.mockRestore()
  })

  it('interpolates :param segments when a params object is passed', async () => {
    const navigate = await getNavigate()
    const push = vi.spyOn(history, 'pushState')

    // TypeScript would validate this at compile time when Register is augmented.
    // At runtime we just verify the interpolation happens correctly.
    navigate('/posts/:id' as any, { id: '42' } as any)

    expect(push).toHaveBeenCalledWith(null, '', '/posts/42')
    push.mockRestore()
  })

  it('interpolates multiple params', async () => {
    const navigate = await getNavigate()
    const push = vi.spyOn(history, 'pushState')

    navigate('/orgs/:org/repos/:repo' as any, { org: 'acme', repo: 'cli' } as any)

    expect(push).toHaveBeenCalledWith(null, '', '/orgs/acme/repos/cli')
    push.mockRestore()
  })

  it('URL-encodes param values', async () => {
    const navigate = await getNavigate()
    const push = vi.spyOn(history, 'pushState')

    navigate('/search/:q' as any, { q: 'hello world' } as any)

    expect(push).toHaveBeenCalledWith(null, '', '/search/hello%20world')
    push.mockRestore()
  })

  it('uses replaceState when { replace: true } is the options', async () => {
    const navigate = await getNavigate()
    const replace = vi.spyOn(history, 'replaceState')

    navigate('/about' as any, { replace: true } as any)

    expect(replace).toHaveBeenCalledWith(null, '', '/about')
    replace.mockRestore()
  })

  it('uses replaceState with params + replace option', async () => {
    const navigate = await getNavigate()
    const replace = vi.spyOn(history, 'replaceState')

    navigate('/posts/:id' as any, { id: '5' } as any, { replace: true } as any)

    expect(replace).toHaveBeenCalledWith(null, '', '/posts/5')
    replace.mockRestore()
  })

  it('treats an object with only { replace } key as options, not params', async () => {
    const navigate = await getNavigate()
    const replace = vi.spyOn(history, 'replaceState')
    const push    = vi.spyOn(history, 'pushState')

    // { replace: true } has no non-'replace' keys → NavigateOptions, not params
    navigate('/about' as any, { replace: true } as any)

    expect(replace).toHaveBeenCalled()
    expect(push).not.toHaveBeenCalled()
    replace.mockRestore()
    push.mockRestore()
  })

  it('treats an object with param keys as params even if a replace key is absent', async () => {
    const navigate = await getNavigate()
    const push = vi.spyOn(history, 'pushState')

    navigate('/users/:id' as any, { id: '7' } as any)

    // The interpolated URL must be pushed, not the pattern
    expect(push).toHaveBeenCalledWith(null, '', '/users/7')
    push.mockRestore()
  })
})
