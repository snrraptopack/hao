/**
 * Auth Plugin
 * 
 * Provides authentication state and methods to page and layout components.
 * Includes user state, login/logout methods, and authentication status.
 * 
 * @example
 * ```typescript
 * const AuthLayout = defineLayout(
 *   (ctx, child) => {
 *     onMount(() => {
 *       if (!ctx.auth.isAuthenticated.value) {
 *         ctx.router.push('/login')
 *       }
 *     })
 *     return <div>{child}</div>
 *   },
 *   [authPlugin()]
 * )
 * ```
 */

import { ref, type Ref } from '../state'
import { definePlugin } from '../plugin'

export type User = {
  id: string
  name: string
  email: string
}

/**
 * Create an auth plugin that provides user state and authentication methods.
 * 
 * @returns A plugin that provides authentication context
 * 
 * @example
 * ```typescript
 * const LoginPage = definePage(
 *   (ctx) => {
 *     const email = ref('')
 *     const password = ref('')
 *     
 *     const handleLogin = async () => {
 *       try {
 *         await ctx.auth.login(email.value, password.value)
 *         ctx.router.push('/dashboard')
 *       } catch (error) {
 *         console.error('Login failed:', error)
 *       }
 *     }
 *     
 *     return (
 *       <form onSubmit={handleLogin}>
 *         <input value={email} onInput={(e) => email.value = e.target.value} />
 *         <input type="password" value={password} onInput={(e) => password.value = e.target.value} />
 *         <button type="submit">Login</button>
 *       </form>
 *     )
 *   },
 *   [authPlugin()]
 * )
 * ```
 */
export function authPlugin() {
  return definePlugin(() => {
    const user = ref<User | null>(null)
    const isAuthenticated = ref(false)
    
    return {
      auth: {
        user,
        isAuthenticated,
        
        async login(email: string, password: string) {
          const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
          })
          
          if (response.ok) {
            const data = await response.json()
            user.value = data.user
            isAuthenticated.value = true
          } else {
            throw new Error('Login failed')
          }
        },
        
        async logout() {
          await fetch('/api/auth/logout', { method: 'POST' })
          user.value = null
          isAuthenticated.value = false
        }
      }
    }
  })
}

// Type augmentation for global context
declare global {
  interface AuwlaMetaContext {
    auth: {
      user: Ref<User | null>
      isAuthenticated: Ref<boolean>
      login: (email: string, password: string) => Promise<void>
      logout: () => Promise<void>
    }
  }
}
