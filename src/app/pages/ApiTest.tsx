import { h } from '../../jsx'
import { ref, watch } from '../../state'
import { When } from '../../jsxutils'
import { $api } from '../$api'

export function ApiTest() {
  const result = ref<any>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const testHello = async () => {
    loading.value = true
    error.value = null
    result.value = null
    try {
      // Type-safe API call with IntelliSense!
      result.value = await $api.hello.get()
    } catch (e) {
      error.value = String(e)
    } finally {
      loading.value = false
    }
  }

  const testProducts = async () => {
    loading.value = true
    error.value = null
    result.value = null
    try {
      // Type-safe with query params!
      result.value = await $api.products.get({ 
        query: { page: 1, pageSize: 5 } 
      })
    } catch (e) {
      error.value = String(e)
    } finally {
      loading.value = false
    }
  }

  const testProduct = async () => {
    loading.value = true
    error.value = null
    result.value = null
    try {
      // Type-safe with route params!
      result.value = await $api.product.get({ 
        params: { id: 1 } 
      })
    } catch (e) {
      error.value = String(e)
    } finally {
      loading.value = false
    }
  }

  const testCreateProduct = async () => {
    loading.value = true
    error.value = null
    result.value = null
    try {
      // Type-safe POST with body!
      result.value = await $api.products.post({ 
        body: { 
          name: 'Test Product', 
          price: 99.99, 
          description: 'Created from UI with $api!' 
        } 
      })
    } catch (e) {
      error.value = String(e)
    } finally {
      loading.value = false
    }
  }

  return (
    <div class="p-8 max-w-4xl mx-auto">
      <h1 class="text-3xl font-bold mb-6">API Test Page</h1>
      
      <div class="space-y-4 mb-8">
        <div class="flex gap-2 flex-wrap">
          <button 
            onClick={testHello}
            class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            disabled={loading}
          >
            Test /api/hello
          </button>
          
          <button 
            onClick={testProducts}
            class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
            disabled={loading}
          >
            Test /api/products
          </button>
          
          <button 
            onClick={testProduct}
            class="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
            disabled={loading}
          >
            Test /api/products/1
          </button>
          
          <button 
            onClick={testCreateProduct}
            class="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 disabled:opacity-50"
            disabled={loading}
          >
            Create Product (POST)
          </button>
        </div>
      </div>

      <When>
        {loading}
        {() => <div class="p-4 bg-blue-50 border border-blue-200 rounded">Loading...</div>}

        {watch(error, (e) => e !== null)}
        {() => (
          <div class="p-4 bg-red-50 border border-red-200 rounded text-red-700">
            Error: {error.value}
          </div>
        )}

        {watch(result, (r) => r !== null)}
        {() => (
          <div class="p-4 bg-gray-50 border border-gray-200 rounded">
            <h3 class="font-semibold mb-2">Response:</h3>
            <pre class="bg-gray-900 text-green-400 p-4 rounded overflow-auto">
              {JSON.stringify(result.value, null, 2)}
            </pre>
          </div>
        )}

        {() => (
          <div class="p-4 bg-gray-50 border border-gray-200 rounded text-gray-500">
            Click a button to test an API endpoint
          </div>
        )}
      </When>
    </div>
  ) as HTMLElement
}
