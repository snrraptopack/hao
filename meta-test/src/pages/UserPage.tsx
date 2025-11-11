/** @jsxImportSource auwla */
import { definePage, fullstackPlugin } from 'auwla-meta'
import { $api } from '../../server/app-hono'
import { If, ref, createResource } from 'auwla'

// Simple page that loads a user by id from query (?id=123)
// Demonstrates using createResource for data fetching with caching
export const UserPage = definePage({
  loader: ({ $api, query }) => {
    const id = String(query.id ?? '1')
    
    // Use createResource for caching and loading states
    const user = createResource(
      `user-${id}`,
      (signal) => $api.getUser({ id }),
      { staleTime: 5000 } // Cache for 5 seconds
    )
    
    return { user }
  },
  component: (_ctx, { user }) => {
    const counter = ref(0)
    
    return (
      <section>
        <h2>User Page</h2>
        
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
      </section>
    )
  },
  meta: { title: 'User Page' },
}, [fullstackPlugin($api)])