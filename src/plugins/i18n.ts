/**
 * i18n Plugin
 * 
 * Provides internationalization support with locale management and translation functions.
 * 
 * @example
 * ```typescript
 * const translations = {
 *   en: { welcome: 'Welcome', goodbye: 'Goodbye' },
 *   es: { welcome: 'Bienvenido', goodbye: 'Adiós' }
 * }
 * 
 * const Page = definePage(
 *   (ctx) => {
 *     return (
 *       <div>
 *         <h1>{ctx.i18n.t('welcome')}</h1>
 *         <button onClick={() => ctx.i18n.setLocale('es')}>Español</button>
 *       </div>
 *     )
 *   },
 *   [i18nPlugin(translations)]
 * )
 * ```
 */

import { ref, type Ref } from '../state'
import { definePlugin } from '../plugin'

export type Translations = Record<string, Record<string, string>>

/**
 * Create an i18n plugin that provides translation and locale management.
 * 
 * @param translations - Object mapping locale codes to translation dictionaries
 * @param defaultLocale - Default locale to use (defaults to 'en')
 * @returns A plugin that provides i18n context
 * 
 * @example
 * ```typescript
 * const translations = {
 *   en: {
 *     welcome: 'Welcome',
 *     goodbye: 'Goodbye',
 *     hello: 'Hello, {name}!'
 *   },
 *   es: {
 *     welcome: 'Bienvenido',
 *     goodbye: 'Adiós',
 *     hello: '¡Hola, {name}!'
 *   }
 * }
 * 
 * const Page = definePage(
 *   (ctx) => {
 *     const name = ref('World')
 *     
 *     return (
 *       <div>
 *         <p>{ctx.i18n.t('hello', { name: name.value })}</p>
 *         <select onChange={(e) => ctx.i18n.setLocale(e.target.value)}>
 *           <option value="en">English</option>
 *           <option value="es">Español</option>
 *         </select>
 *       </div>
 *     )
 *   },
 *   [i18nPlugin(translations)]
 * )
 * ```
 */
export function i18nPlugin(translations: Translations, defaultLocale = 'en') {
  return definePlugin(() => {
    const locale = ref(defaultLocale)
    
    return {
      i18n: {
        locale,
        
        t(key: string, params?: Record<string, string | number>): string {
          const currentTranslations = translations[locale.value] || translations[defaultLocale]
          let translation = currentTranslations?.[key] || key
          
          // Simple parameter substitution
          if (params) {
            Object.entries(params).forEach(([paramKey, paramValue]) => {
              translation = translation.replace(`{${paramKey}}`, String(paramValue))
            })
          }
          
          return translation
        },
        
        setLocale(newLocale: string) {
          if (translations[newLocale]) {
            locale.value = newLocale
          } else {
            console.warn(`[i18n] Locale "${newLocale}" not found`)
          }
        },
        
        getAvailableLocales(): string[] {
          return Object.keys(translations)
        }
      }
    }
  })
}

// Type augmentation for global context
declare global {
  interface AuwlaMetaContext {
    i18n: {
      locale: Ref<string>
      t: (key: string, params?: Record<string, string | number>) => string
      setLocale: (locale: string) => void
      getAvailableLocales: () => string[]
    }
  }
}
