/** @jsxImportSource auwla */
import { i18nPlugin } from './i18n'
import { definePage } from '../meta'

export const exampleTranslations = {
  en: {
    welcome: 'Welcome',
    logout: 'Logout',
    user_greeting: 'Hello, {name}!'
  },
  es: {
    welcome: 'Bienvenido',
    logout: 'Cerrar sesión',
    user_greeting: '¡Hola, {name}!'
  }
}

export const I18nDemo = definePage(
  (ctx) => {
    return (
      <div>
        <h2>{ctx.i18n.t('welcome')}</h2>
        <select onChange={(e: any) => ctx.i18n.setLocale(e.target.value)}>
          {ctx.i18n.getAvailableLocales().map(loc => (
            <option key={loc} value={loc}>{loc}</option>
          ))}
        </select>
      </div>
    ) as HTMLElement
  },
  [i18nPlugin(exampleTranslations)]
)

