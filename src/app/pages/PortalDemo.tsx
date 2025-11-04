import { h, ref, When, Portal } from "../../index"

/**
 * Demo page showcasing Portal component usage
 */
export function App() {
  const showModal = ref(false)
  const showTooltip = ref(false)
  
  return (
    <div class="container mx-auto p-8">
      <h1 class="text-4xl font-bold mb-8">Portal Component Demo</h1>
      
      {/* Demo 1: Modal Portal */}
      <section class="mb-12">
        <h2 class="text-2xl font-semibold mb-4">1. Modal with Portal</h2>
        <p class="text-gray-600 mb-4">
          Modal is rendered in document.body, escaping parent overflow constraints.
        </p>
        
        <div 
          class="border-2 border-dashed border-gray-300 p-6 rounded-lg"
          style="overflow: hidden; position: relative; max-height: 200px"
        >
          <p class="text-sm text-gray-500 mb-4">
            ⚠️ Parent has <code>overflow: hidden</code> - without Portal, modal would be clipped!
          </p>
          
          <button 
            class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            onClick={() => showModal.value = true}
          >
            Open Modal
          </button>
          
          {/* Modal with Portal - renders in body, not clipped */}
          <When>
            {showModal}
            {() => (
              <Portal>
                <div 
                  class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
                  onClick={() => showModal.value = false}
                >
                  <div 
                    class="bg-white p-8 rounded-lg shadow-xl max-w-md w-full m-4"
                    onClick={(e: Event) => e.stopPropagation()}
                  >
                    <h3 class="text-2xl font-bold mb-4">Portal Modal</h3>
                    <p class="text-gray-700 mb-6">
                      This modal is rendered using a Portal component. It's actually 
                      mounted to <code>document.body</code>, not inside the parent div 
                      with overflow:hidden.
                    </p>
                    <p class="text-sm text-gray-500 mb-6">
                      Inspect the DOM to see where this element actually lives!
                    </p>
                    <button 
                      class="px-6 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                      onClick={() => showModal.value = false}
                    >
                      Close Modal
                    </button>
                  </div>
                </div>
              </Portal>
            )}
          </When>
        </div>
      </section>
      
      {/* Demo 2: Tooltip Portal */}
      <section class="mb-12">
        <h2 class="text-2xl font-semibold mb-4">2. Tooltip with Portal</h2>
        <p class="text-gray-600 mb-4">
          Tooltip rendered to body to avoid z-index stacking issues.
        </p>
        
        <div class="relative inline-block">
          <button 
            class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            onMouseEnter={() => showTooltip.value = true}
            onMouseLeave={() => showTooltip.value = false}
          >
            Hover me for tooltip
          </button>
          
          <When>
            {showTooltip}
            {() => (
              <Portal>
                <div 
                  class="fixed top-32 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-4 py-2 rounded shadow-lg text-sm z-50"
                  style="pointer-events: none"
                >
                  I'm a tooltip in a Portal!
                </div>
              </Portal>
            )}
          </When>
        </div>
      </section>
      
      {/* Demo 3: Nested overflow example */}
      <section class="mb-12">
        <h2 class="text-2xl font-semibold mb-4">3. Without Portal (Problem Demo)</h2>
        <p class="text-gray-600 mb-4">
          This shows what happens WITHOUT Portal - content gets clipped.
        </p>
        
        <div 
          class="border-2 border-red-300 p-6 rounded-lg relative"
          style="overflow: hidden; height: 150px"
        >
          <p class="text-sm text-red-600 mb-4">
            ⚠️ Parent has <code>overflow: hidden</code> - dropdown will be clipped!
          </p>
          
          <div class="relative inline-block">
            <button class="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">
              Try to open dropdown
            </button>
            
            {/* Dropdown without Portal - gets clipped! */}
            <div class="absolute top-full left-0 mt-2 bg-white shadow-lg rounded-lg p-4 w-64 border border-gray-200">
              <p class="text-sm text-gray-700">
                😢 I'm being clipped by parent's overflow:hidden! 
                Use Portal to fix this.
              </p>
            </div>
          </div>
        </div>
      </section>
      
      {/* Code example */}
      <section class="bg-gray-50 p-6 rounded-lg">
        <h2 class="text-xl font-semibold mb-4">Usage Example:</h2>
        <pre class="bg-gray-900 text-green-400 p-4 rounded overflow-x-auto text-sm">
{`import { Portal, When, ref } from 'auwla'

function MyComponent() {
  const showModal = ref(false)
  
  return (
    <div>
      <button onClick={() => showModal.value = true}>
        Open Modal
      </button>
      
      <When>
        {showModal}
        {() => (
          <Portal>
            <div class="modal-backdrop">
              <div class="modal-content">
                <h2>Modal Title</h2>
                <button onClick={() => showModal.value = false}>
                  Close
                </button>
              </div>
            </div>
          </Portal>
        )}
      </When>
    </div>
  )
}`}
        </pre>
      </section>
    </div>
  )
}
