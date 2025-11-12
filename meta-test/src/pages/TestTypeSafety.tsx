/** @jsxImportSource auwla */
import { definePage, fullstackPlugin, plugins } from 'auwla'
import { $api } from '../../server/app-hono'

// Test that $api is properly typed
export const TestPage = definePage(
  (ctx) => {
    // This should be type-safe - TypeScript should know about getUser
    const result = ctx.$api.getUser({ id: '1' })
    
    // This should error - nonExistentMethod doesn't exist
    // @ts-expect-error - Testing that invalid methods are caught
    ctx.$api.nonExistentMethod()
    
    // This should error - wrong parameter type
    // @ts-expect-error - Testing that parameter types are enforced
    ctx.$api.getUser({ id: 123 })
    
    return <div>Type Safety Test</div>
  },
  plugins(fullstackPlugin($api))
)
