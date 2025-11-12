/** @jsxImportSource auwla */
import { defineLayout, authPlugin, i18nPlugin, If ,watch} from 'auwla'
import { exampleTranslations } from '../../../src/plugins/i18n/examples'


// Create plugin instances
const auth = authPlugin()
const i18n = i18nPlugin(exampleTranslations)

// Layout that provides auth and i18n to all children
// Also exports a .definePage helper for type-safe child pages
export const AuthLayout = defineLayout(
  (ctx, child) => {
    // Note: Don't use lifecycle hooks in layout wrapper
    // Use them in the pages instead

    watch(ctx.i18n.locale,(value)=> console.log(value))
    
    return (
      <div class="auth-layout" style={{ padding: '1rem' }}>
        <header style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          padding: '1rem', 
          background: '#f5f5f5',
          marginBottom: '1rem'
        }}>
          <div>
            <h2 style={{ margin: 0 }}>{ctx.i18n.t('welcome')}</h2>
            {If(() => ctx.auth.user.value, (user) => (
              <p style={{ margin: '0.5rem 0 0 0' }}>
                {ctx.i18n.t('user_greeting', { name: user.name })}
              </p>
            ))}
          </div>
          
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <select 
              value={ctx.i18n.locale.value}
              onChange={(e) => ctx.i18n.setLocale((e.target as HTMLSelectElement).value)}
            >
              <option value="en">English</option>
              <option value="es">Español</option>
            </select>
            
            <button onClick={() => ctx.auth.logout()}>
              {ctx.i18n.t('logout')}
            </button>
          </div>
        </header>
        
        <main>{child}</main>
        
        <footer style={{ marginTop: '2rem', padding: '1rem', background: '#f9f9f9', fontSize: '0.85em' }}>
          <p style={{ margin: 0 }}>
            Layout provides: auth, i18n | Path: {ctx.path}
          </p>
        </footer>
      </div>
    )
  },
  [auth, i18n] as const
)
