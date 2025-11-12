/**
 * Analytics Plugin
 * 
 * Provides event tracking functionality for analytics and monitoring.
 * 
 * @example
 * ```typescript
 * const Page = definePage(
 *   (ctx) => {
 *     onMount(() => {
 *       ctx.analytics.track('page_view', { path: ctx.path })
 *     })
 *     
 *     return (
 *       <button onClick={() => ctx.analytics.track('button_click', { button: 'cta' })}>
 *         Click me
 *       </button>
 *     )
 *   },
 *   [analyticsPlugin('UA-123456')]
 * )
 * ```
 */

import { definePlugin } from '../plugin'

/**
 * Create an analytics plugin that provides event tracking.
 * 
 * @param trackingId - Analytics tracking ID (e.g., Google Analytics UA code)
 * @param options - Optional configuration
 * @returns A plugin that provides analytics context
 * 
 * @example
 * ```typescript
 * const Page = definePage(
 *   (ctx) => {
 *     const handlePurchase = () => {
 *       ctx.analytics.track('purchase', {
 *         product_id: '123',
 *         price: 29.99,
 *         currency: 'USD'
 *       })
 *     }
 *     
 *     return <button onClick={handlePurchase}>Buy Now</button>
 *   },
 *   [analyticsPlugin('UA-123456', { debug: true })]
 * )
 * ```
 */
export function analyticsPlugin(
  trackingId: string,
  options: { debug?: boolean } = {}
) {
  return definePlugin(() => {
    const { debug = false } = options
    
    return {
      analytics: {
        track(event: string, data?: Record<string, any>) {
          if (debug) {
            console.log(`[Analytics] ${event}`, data)
          }
          
          // Send to analytics service
          // This is a placeholder - integrate with your analytics provider
          if (typeof window !== 'undefined' && (window as any).gtag) {
            (window as any).gtag('event', event, {
              ...data,
              tracking_id: trackingId
            })
          }
        },
        
        pageView(path: string, title?: string) {
          this.track('page_view', {
            page_path: path,
            page_title: title || document.title
          })
        },
        
        setUser(userId: string, properties?: Record<string, any>) {
          if (debug) {
            console.log(`[Analytics] Set user: ${userId}`, properties)
          }
          
          if (typeof window !== 'undefined' && (window as any).gtag) {
            (window as any).gtag('set', {
              user_id: userId,
              ...properties
            })
          }
        }
      }
    }
  })
}

// Type augmentation for global context
declare global {
  interface AuwlaMetaContext {
    analytics: {
      track: (event: string, data?: Record<string, any>) => void
      pageView: (path: string, title?: string) => void
      setUser: (userId: string, properties?: Record<string, any>) => void
    }
  }
}
