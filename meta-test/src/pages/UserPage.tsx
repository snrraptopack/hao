/** @jsxImportSource auwla */
import { definePage, fullstackPlugin, plugins, If, ref, createResource, onRouted } from 'auwla'
import { $api } from '../../server/app-hono'


export const UserPage = definePage(
  (ctx) => {
    const id = String(ctx.query.id ?? '1')
    
    // Use createResource for caching and loading states
    const user = createResource(
      `user-${id}`,
      () => ctx.$api.getUser({ id }),
      { staleTime: 50000 } // Cache for 5 seconds
    )
    
    // Refetch when route changes
    onRouted(() => {
      const newId = String(ctx.query.id ?? '1')
      if (newId !== id) {
        user.refetch({ force: true })
      }
    })
    
    // Local component state
    const counter = ref(0)
    
    return (
      <section>
        <h2>User Page (New API)</h2>
        <p style={{ fontSize: '0.9em', color: '#666' }}>
          Using simplified plugin system with createResource
        </p>
        
        {If(() => user.loading.value, () => (
          <p>Loading user...</p>
        ))}
        
        {If(() => user.error.value, (error) => (
          <p style={{ color: 'red' }}>Error: {error.message}</p>
        ))}
        
        {If(() => user.data.value, (data) => (
          <div>
            <p>User ID: {data.id}</p>
            <p>Name: {data.name}</p>
            <button onClick={() => user.refetch({ force: true })}>
              Refresh User
            </button>
          </div>
        ))}
        
        <div style={{ marginTop: '20px' }}>
          <button onClick={() => counter.value++}>
            Counter: {counter}
          </button>
        </div>
        
        <div style={{ marginTop: '20px', fontSize: '0.85em', color: '#888' }}>
          <p>Current path: {ctx.path}</p>
          <p>Query params: {JSON.stringify(ctx.query)}</p>
        </div>
      </section>
    )
  },
  plugins(fullstackPlugin($api))
)