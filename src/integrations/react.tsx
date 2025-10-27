import { onMount } from '../lifecycle'
import { watch, type Ref } from '../state'

function isRef<T = any>(v: any): v is Ref<T> {
  return v && typeof v === 'object' && 'value' in v && typeof v.subscribe === 'function'
}

/**
 * ReactIsland mounts a React component into an AUWLA component subtree.
 *
 * Usage:
 *  - Install react and react-dom: `npm i react react-dom`
 *  - Import and use: <ReactIsland component={SomeReactComponent} props={{ title: titleRef }} />
 *
 * Notes:
 *  - Props can be plain values or AUWLA Refs. Refs are watched and trigger re-renders.
 *  - Cleanup: the React root is unmounted when this AUWLA component unmounts.
 */
export function ReactIsland(config: { component: any; props?: Record<string, any> }): HTMLElement {
  const container = document.createElement('div')

  let root: any = null
  let currentProps: Record<string, any> = {}

  // Initialize props and set up watchers for Ref values
  const entries = Object.entries(config.props || {})
  for (const [key, val] of entries) {
    if (isRef(val)) {
      currentProps[key] = (val as Ref<any>).value
      // side-effect watch; auto-cleaned when component unmounts
      watch(val as Ref<any>, (v) => {
        currentProps[key] = v
        if (root) {
          try {
            // Lazy import React to build element only when needed
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const React = require('react')
            root.render(React.createElement(config.component, currentProps))
          } catch (e) {
            console.error('React re-render failed (is React installed?)', e)
          }
        }
      })
    } else {
      currentProps[key] = val
    }
  }

  onMount(() => {
    ;(async () => {
      try {
        const React = (await import('react')).default || (await import('react'))
        const ReactDOM = await import('react-dom/client')
        root = (ReactDOM as any).createRoot(container)
        root.render((React as any).createElement(config.component, currentProps))
      } catch (e) {
        console.error('ReactIsland mount failed. Install react & react-dom:', e)
      }
    })()
    return () => {
      try { root?.unmount?.() } catch {}
    }
  })

  return container
}

/**
 * Convenience helper to wrap a React element factory (JSX) by returning a AUWLA component.
 * Example:
 *   const ButtonIsland = createReactIsland(Button)
 *   <ButtonIsland props={{ onClick: () => alert('hi') }} />
 */
export function createReactIsland(component: any) {
  return function ReactIslandFactory(props: { props?: Record<string, any> }) {
    return ReactIsland({ component, props: props.props })
  }
}