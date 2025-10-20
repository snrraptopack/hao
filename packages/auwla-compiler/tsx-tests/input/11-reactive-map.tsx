// @page /reactive-map
// Test case: .map() with reactive array (should use ui.List)

import { ref, type Ref } from 'auwla'

const reactiveItems: Ref<Array<{ id: number; name: string }>> = ref([
  { id: 1, name: 'Reactive Item 1' },
  { id: 2, name: 'Reactive Item 2' },
  { id: 3, name: 'Reactive Item 3' }
])

export default function ReactiveMapPage() {
  return (
    <div className="p-8">
      <h1>Reactive Map Test</h1>
      
      <button onClick={() => reactiveItems.value.push({ 
        id: Date.now(), 
        name: `New Item ${reactiveItems.value.length + 1}` 
      })}>
        Add Item
      </button>
      
      <div className="mt-4">
        {/* This should compile to ui.List() because reactiveItems is a ref */}
        {reactiveItems.value.map(item => 
          <div key={item.id} className="p-2 border">
            {item.name}
          </div>
        )}
      </div>
    </div>
  )
}