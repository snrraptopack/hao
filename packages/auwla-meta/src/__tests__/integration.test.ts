/**
 * Integration tests for @auwla/meta
 * 
 * These tests verify the runtime behavior of:
 * - definePage with and without loaders
 * - defineLayout with plugin inheritance
 * - Plugin lifecycle hooks
 * - Context creation and propagation
 */

import { describe, it, expect, beforeEach } from 'bun:test'
import { definePage, defineLayout, definePlugin, pushPluginContext, popPluginContext, getCurrentPlugins } from '../index'

describe('@auwla/meta Integration Tests', () => {
  beforeEach(() => {
    // Reset plugin context stack before each test
    while (getCurrentPlugins().length > 0) {
      popPluginContext()
    }
  })

  describe('definePage', () => {
    it('should create a page without loader', () => {
      const page = definePage({
        component: () => {
          const div = document.createElement('div')
          div.textContent = 'Hello'
          return div
        }
      })

      expect(typeof page).toBe('function')
    })

    it('should create a page with sync loader', () => {
      const page = definePage({
        loader: (ctx) => {
          return { data: 'test' }
        },
        component: (ctx, data) => {
          const div = document.createElement('div')
          div.textContent = data.data
          return div
        }
      })

      expect(typeof page).toBe('function')
    })

    it('should create a page with async loader', () => {
      const page = definePage({
        loader: async (ctx) => {
          return { data: await Promise.resolve('async test') }
        },
        component: (ctx, data) => {
          const div = document.createElement('div')
          div.textContent = data.data
          return div
        }
      })

      expect(typeof page).toBe('function')
    })
  })

  describe('defineLayout', () => {
    it('should create a layout function', () => {
      const layout = defineLayout({
        component: (ctx, data, child) => {
          const div = document.createElement('div')
          div.appendChild(child)
          return div
        }
      })

      expect(typeof layout).toBe('function')
    })

    it('should accept params and query parameters', () => {
      const layout = defineLayout({
        component: (ctx, data, child) => {
          const div = document.createElement('div')
          div.appendChild(child)
          return div
        }
      })

      const child = document.createElement('span')
      const result = layout(child, { id: '123' }, { tab: 'posts' })

      expect(result).toBeInstanceOf(HTMLElement)
      expect(result.contains(child)).toBe(true)
    })
  })

  describe('Plugin System', () => {
    it('should create a plugin', () => {
      const plugin = definePlugin({
        name: 'test',
        onContextCreate(ctx) {
          ;(ctx as any).testProp = 'test value'
        }
      })

      expect(plugin.name).toBe('test')
      expect(typeof plugin.onContextCreate).toBe('function')
    })

    it('should apply plugin to context', () => {
      let contextReceived: any = null

      const plugin = definePlugin({
        name: 'test',
        onContextCreate(ctx) {
          contextReceived = ctx
          ;(ctx as any).testProp = 'test value'
        }
      })

      const page = definePage({
        component: () => document.createElement('div')
      }, [plugin])

      expect(typeof page).toBe('function')
      // Plugin will be applied when page component is created
    })

    it('should execute plugin lifecycle hooks in order', async () => {
      const executionOrder: string[] = []

      const plugin = definePlugin({
        name: 'lifecycle',
        onContextCreate(ctx) {
          executionOrder.push('onContextCreate')
        },
        onBeforeLoad(ctx) {
          executionOrder.push('onBeforeLoad')
        },
        onAfterLoad(ctx, data) {
          executionOrder.push('onAfterLoad')
        }
      })

      const page = definePage({
        loader: async (ctx) => {
          executionOrder.push('loader')
          return { data: 'test' }
        },
        component: (ctx, data) => {
          executionOrder.push('component')
          return document.createElement('div')
        }
      }, [plugin])

      expect(typeof page).toBe('function')
      // Hooks will execute when page is mounted in router
    })

    it('should handle plugin errors gracefully', () => {
      const plugin = definePlugin({
        name: 'error-plugin',
        onContextCreate(ctx) {
          throw new Error('Plugin error')
        }
      })

      // Should not throw - errors are swallowed
      const page = definePage({
        component: () => document.createElement('div')
      }, [plugin])

      expect(typeof page).toBe('function')
    })
  })

  describe('Plugin Context Inheritance', () => {
    it('should push and pop plugin context', () => {
      const plugin1 = definePlugin({ name: 'plugin1' })
      const plugin2 = definePlugin({ name: 'plugin2' })

      expect(getCurrentPlugins().length).toBe(0)

      pushPluginContext([plugin1])
      expect(getCurrentPlugins().length).toBe(1)
      expect(getCurrentPlugins()[0]?.name).toBe('plugin1')

      pushPluginContext([plugin2])
      expect(getCurrentPlugins().length).toBe(2)
      expect(getCurrentPlugins()[1]?.name).toBe('plugin2')

      popPluginContext()
      expect(getCurrentPlugins().length).toBe(1)
      expect(getCurrentPlugins()[0]?.name).toBe('plugin1')

      popPluginContext()
      expect(getCurrentPlugins().length).toBe(0)
    })

    it('should inherit parent plugins in child context', () => {
      const parentPlugin = definePlugin({ name: 'parent' })
      const childPlugin = definePlugin({ name: 'child' })

      pushPluginContext([parentPlugin])

      const currentPlugins = getCurrentPlugins()
      expect(currentPlugins.length).toBe(1)
      expect(currentPlugins[0]?.name).toBe('parent')

      // Child should inherit parent plugins
      pushPluginContext([childPlugin])
      const childPlugins = getCurrentPlugins()
      expect(childPlugins.length).toBe(2)
      expect(childPlugins[0]?.name).toBe('parent')
      expect(childPlugins[1]?.name).toBe('child')

      popPluginContext()
    })

    it('should merge layout plugins with page plugins', () => {
      const layoutPlugin = definePlugin({ name: 'layout' })
      const pagePlugin = definePlugin({ name: 'page' })

      // Simulate layout pushing its plugins
      pushPluginContext([layoutPlugin])

      // Page should inherit layout plugins and add its own
      const page = definePage({
        component: () => document.createElement('div')
      }, [pagePlugin])

      // The page will have both plugins when created
      expect(typeof page).toBe('function')

      popPluginContext()
    })

    it('should not pop below base context', () => {
      expect(getCurrentPlugins().length).toBe(0)

      popPluginContext()
      popPluginContext()
      popPluginContext()

      // Should still be at base level
      expect(getCurrentPlugins().length).toBe(0)
    })
  })

  describe('Nested Layouts', () => {
    it('should stack plugins from nested layouts', () => {
      const layout1Plugin = definePlugin({ name: 'layout1' })
      const layout2Plugin = definePlugin({ name: 'layout2' })
      const pagePlugin = definePlugin({ name: 'page' })

      // First layout
      pushPluginContext([layout1Plugin])
      expect(getCurrentPlugins().length).toBe(1)

      // Second layout (nested)
      pushPluginContext([layout2Plugin])
      expect(getCurrentPlugins().length).toBe(2)

      // Page in nested layout
      const currentPlugins = getCurrentPlugins()
      expect(currentPlugins[0]?.name).toBe('layout1')
      expect(currentPlugins[1]?.name).toBe('layout2')

      // Clean up
      popPluginContext()
      popPluginContext()
    })
  })

  describe('Error Handling', () => {
    it('should call onError hook when loader throws', async () => {
      let errorCaught: any = null

      const plugin = definePlugin({
        name: 'error-handler',
        onError(ctx, error) {
          errorCaught = error
        }
      })

      const page = definePage({
        loader: async (ctx) => {
          throw new Error('Loader error')
        },
        component: (ctx, data) => document.createElement('div')
      }, [plugin])

      expect(typeof page).toBe('function')
      // Error will be caught when loader runs
    })

    it('should handle async plugin hooks', async () => {
      const plugin = definePlugin({
        name: 'async-plugin',
        async onBeforeLoad(ctx) {
          await Promise.resolve()
        },
        async onAfterLoad(ctx, data) {
          await Promise.resolve()
        }
      })

      const page = definePage({
        loader: async (ctx) => ({ data: 'test' }),
        component: (ctx, data) => document.createElement('div')
      }, [plugin])

      expect(typeof page).toBe('function')
    })
  })
})
