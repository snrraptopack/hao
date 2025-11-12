/** @jsxImportSource auwla */
import { analyticsPlugin, ref, onMount } from 'auwla'
import { AuthLayout } from '../layouts/AuthLayout'

// Create analytics plugin for this page
const analytics = analyticsPlugin('UA-TEST', { debug: true })

// Dashboard page that inherits auth and i18n from AuthLayout
// and adds its own analytics plugin
// Use AuthLayout.definePage for automatic type safety!
export const DashboardPage = AuthLayout.definePage(
  (ctx) => {
    const stats = ref({ views: 0, clicks: 0 })
    
    onMount(() => {
      // Test that we have access to all plugins:
      // - auth (from layout)
      // - i18n (from layout)
      // - analytics (from this page)
      
      console.log('DashboardPage mounted')
      console.log('Has auth?', !!ctx.auth)
      console.log('Has i18n?', !!ctx.i18n)
      console.log('Has analytics?', !!ctx.analytics)
      
      // Track page view
      ctx.analytics.track('dashboard_viewed')
      
      // Simulate loading stats
      setTimeout(() => {
        stats.value = { views: 1234, clicks: 567 }
      }, 500)
    })
    
    return (
      <section>
        <h1>Dashboard</h1>
        
        <div style={{ marginBottom: '1rem', padding: '1rem', background: '#e3f2fd' }}>
          <h3 style={{ margin: '0 0 0.5rem 0' }}>Type Safety Test</h3>
          <p style={{ margin: 0, fontSize: '0.9em' }}>
            This page should have access to:
          </p>
          <ul style={{ margin: '0.5rem 0 0 0' }}>
            <li>ctx.auth (from AuthLayout) ✅</li>
            <li>ctx.i18n (from AuthLayout) ✅</li>
            <li>ctx.analytics (from this page) ✅</li>
            <li>ctx.params, ctx.query, ctx.path (always available) ✅</li>
          </ul>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div style={{ padding: '1rem', background: '#f3e5f5' }}>
            <h3 style={{ margin: '0 0 0.5rem 0' }}>Views</h3>
            <p style={{ fontSize: '2rem', margin: 0 }}>{stats.value.views}</p>
          </div>
          
          <div style={{ padding: '1rem', background: '#fff3e0' }}>
            <h3 style={{ margin: '0 0 0.5rem 0' }}>Clicks</h3>
            <p style={{ fontSize: '2rem', margin: 0 }}>{stats.value.clicks}</p>
          </div>
        </div>
        
        <div style={{ marginTop: '1rem' }}>
          <button 
            onClick={() => {
              ctx.analytics.track('refresh_clicked')
              stats.value = { 
                views: Math.floor(Math.random() * 10000), 
                clicks: Math.floor(Math.random() * 5000) 
              }
            }}
            style={{ padding: '0.75rem 1.5rem' }}
          >
            Refresh Stats
          </button>
        </div>
        
        <div style={{ marginTop: '2rem', padding: '1rem', background: '#f5f5f5' }}>
          <h4 style={{ margin: '0 0 0.5rem 0' }}>Context Info:</h4>
          <pre style={{ margin: 0, fontSize: '0.85em', overflow: 'auto' }}>
            {JSON.stringify({
              path: ctx.path,
              locale: ctx.i18n.locale.value,
              authenticated: ctx.auth.isAuthenticated.value,
              user: ctx.auth.user.value?.name || 'Not logged in'
            }, null, 2)}
          </pre>
        </div>
      </section>
    )
  },
  [analytics] as const
)
