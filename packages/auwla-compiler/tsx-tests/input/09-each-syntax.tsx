// @page /each-syntax
// Test case: $each for reactive iteration

import { ref, type Ref } from 'auwla'
import { $each } from 'auwla/template'

const items: Ref<Array<{ id: number; name: string; active: boolean }>> = ref([
  { id: 1, name: 'Item 1', active: true },
  { id: 2, name: 'Item 2', active: false },
  { id: 3, name: 'Item 3', active: true }
])

export default function EachSyntaxPage() {
  return (
    <div className="p-8">
      <h1>Each Syntax Test</h1>
      
      <button onClick={() => items.value.push({ 
        id: Date.now(), 
        name: `Item ${items.value.length + 1}`, 
        active: Math.random() > 0.5 
      })}>
        Add Item
      </button>
      
      <div className="mt-4">
        {/* Test $each with reactive array */}
        {$each(items, (item) => 
          <div key={item.id} className={item.active ? 'bg-green-100' : 'bg-gray-100'}>
            <span>{item.name}</span>
            <button onClick={() => item.active = !item.active}>
              {item.active ? 'Deactivate' : 'Activate'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}