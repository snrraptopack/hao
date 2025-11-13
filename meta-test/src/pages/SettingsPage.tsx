/** @jsxImportSource auwla */
import { ref, onMount, watch } from 'auwla'
import { AuthLayout } from '../layouts/AuthLayout'

// Settings page - automatically gets auth and i18n from AuthLayout!
// No need to pass plugins or do any setup
export const SettingsPage = AuthLayout.definePage(
  (ctx) => {
    const darkMode = ref(false)
    
    onMount(() => {
      console.log('Settings page mounted')
      //  ctx.auth is available (from AuthLayout)
      //  ctx.i18n is available (from AuthLayout)
      console.log('User:', ctx.auth.user.value?.name)
      console.log('Locale:', ctx.i18n.locale.value)
    })

    watch(ctx.i18n.locale,(v)=> console.log("in",v))    
    return (
      <section>
        <h1>Settings</h1>
        
        <div style={{ padding: '1rem', background: '#f5f5f5', marginBottom: '1rem' }}>
          <h3 style={{ margin: '0 0 0.5rem 0' }}>✨ Type Safety Demo</h3>
          <p style={{ margin: 0, fontSize: '0.9em' }}>
            This page uses <code>AuthLayout.definePage</code> so TypeScript automatically knows about:
          </p>
          <ul style={{ margin: '0.5rem 0 0 0' }}>
            <li>✅ ctx.auth (from layout)</li>
            <li>✅ ctx.i18n (from layout)</li>
            <li>✅ ctx.params, ctx.query, ctx.path (always available)</li>
          </ul>
        </div>
        
        <label style={{ display: 'block', marginBottom: '1rem' }}>
          <input 
            type="checkbox" 
            checked={darkMode.value}
            onChange={(e) => darkMode.value = (e.target as HTMLInputElement).checked}
          />
          {' '}Dark Mode
        </label>
        
        <div style={{ padding: '1rem', background: darkMode.value ? '#333' : '#fff', color: darkMode.value ? '#fff' : '#000' }}>
          <p>Current theme: {darkMode.value ? 'Dark' : 'Light'}</p>
          <p>User: {ctx.auth.user.value?.name || 'Not logged in'}</p>
          <p>Language: {ctx.i18n.locale}</p>
        </div>
      </section>
    )
  }
  // No plugins array needed! Auth and i18n come from AuthLayout
)
