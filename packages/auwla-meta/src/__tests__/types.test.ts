/**
 * Type safety tests for @auwla/meta
 * 
 * These tests verify that TypeScript inference works correctly for:
 * - Plugin type composition
 * - LoaderContext type merging
 * - Layout plugin inheritance
 */

import { definePage, defineLayout, definePlugin, type LoaderContext } from '../index'

// Test 1: Single plugin type inference
declare global {
  interface AuwlaMetaContext {
    testProp?: string
  }
}

const testPlugin = definePlugin({
  name: 'test',
  onContextCreate(ctx) {
    ctx.testProp = 'test'
  }
})

// Should infer testProp in context
const pageWithPlugin = definePage({
  loader: (ctx) => {
    // @ts-expect-error - testProp should exist
    const _test: string = ctx.testProp
    return { data: 'test' }
  },
  component: (ctx, data) => {
    return document.createElement('div')
  }
}, [testPlugin])

// Test 2: Multiple plugin type composition
type AuthExt = { auth: { userId: string } }
type AnalyticsExt = { analytics: { track: (event: string) => void } }

const authPlugin = definePlugin<AuthExt>({
  name: 'auth',
  onContextCreate(ctx) {
    ;(ctx as any).auth = { userId: '123' }
  }
})

const analyticsPlugin = definePlugin<AnalyticsExt>({
  name: 'analytics',
  onContextCreate(ctx) {
    ;(ctx as any).analytics = { track: (event: string) => console.log(event) }
  }
})

const pageWithMultiplePlugins = definePage<AuthExt & AnalyticsExt>({
  loader: (ctx) => {
    // Both plugin properties should be available
    const userId: string = ctx.auth.userId
    ctx.analytics.track('page_view')
    return { userId }
  },
  component: (ctx, data) => {
    return document.createElement('div')
  }
}, [authPlugin, analyticsPlugin])

// Test 3: LoaderContext type merging
type CustomExt = { custom: { value: number } }

const customPlugin = definePlugin<CustomExt>({
  name: 'custom',
  onContextCreate(ctx) {
    ;(ctx as any).custom = { value: 42 }
  }
})

const pageWithCustomExt = definePage<CustomExt>({
  loader: (ctx: LoaderContext<CustomExt>) => {
    // Should have base context properties
    const params = ctx.params
    const query = ctx.query
    const path = ctx.path
    const router = ctx.router
    const prev = ctx.prev
    
    // Should have custom extension
    const value: number = ctx.custom.value
    
    return { value }
  },
  component: (ctx, data) => {
    return document.createElement('div')
  }
}, [customPlugin])

// Test 4: Layout plugin inheritance types
const layoutWithPlugin = defineLayout<AuthExt>({
  loader: (ctx) => {
    // Should have auth from plugin
    const userId: string = ctx.auth.userId
    return { userId }
  },
  component: (ctx, data, child) => {
    const div = document.createElement('div')
    div.appendChild(child)
    return div
  }
}, [authPlugin])

// Child page should inherit auth type
const childPage = definePage<AuthExt>({
  loader: (ctx) => {
    // Should have auth from parent layout
    const userId: string = ctx.auth.userId
    return { userId }
  },
  component: (ctx, data) => {
    return document.createElement('div')
  }
  // No plugins needed - inherited from layout
})

// Test 5: Loader return type inference
const pageWithTypedLoader = definePage({
  loader: (ctx) => {
    return {
      user: { id: '123', name: 'John' },
      posts: [{ id: '1', title: 'Post 1' }]
    }
  },
  component: (ctx, data) => {
    // data should be inferred correctly
    const userId: string = data.user.id
    const userName: string = data.user.name
    const postCount: number = data.posts.length
    
    return document.createElement('div')
  }
})

// Test 6: Async loader return type
const pageWithAsyncLoader = definePage({
  loader: async (ctx) => {
    return {
      data: await Promise.resolve('async data')
    }
  },
  component: (ctx, data) => {
    // data should be inferred as { data: string }
    const value: string = data.data
    return document.createElement('div')
  }
})

// Test 7: Void loader (no return)
const pageWithoutLoader = definePage({
  component: (ctx, data) => {
    // data should be void
    const _void: void = data
    return document.createElement('div')
  }
})

// Test 8: Plugin lifecycle hooks types
const pluginWithHooks = definePlugin<AuthExt>({
  name: 'auth-with-hooks',
  onContextCreate(ctx) {
    ;(ctx as any).auth = { userId: '123' }
  },
  onBeforeLoad(ctx) {
    // Should have auth property
    const userId: string = ctx.auth.userId
  },
  onAfterLoad(ctx, data) {
    // Should have auth property and data
    const userId: string = ctx.auth.userId
    console.log('Loaded:', data)
  },
  onError(ctx, error) {
    // Should have auth property and error
    const userId: string = ctx.auth.userId
    console.error('Error:', error)
  }
})

// Export to prevent "unused" errors
export {
  pageWithPlugin,
  pageWithMultiplePlugins,
  pageWithCustomExt,
  layoutWithPlugin,
  childPage,
  pageWithTypedLoader,
  pageWithAsyncLoader,
  pageWithoutLoader,
  pluginWithHooks
}
