// @page /simple-each
// Test case: Simple $each test

import { ref, type Ref } from 'auwla'
import { $each } from 'auwla/template'

export default function SimpleEachPage() {
  const items: Ref<string[]> = ref(['Apple', 'Banana', 'Cherry'])

  return (
    <div className="p-8">
      <h1>Simple Each Test</h1>
      
      {$each(items, (item) => 
        <div key={item}>
          {item}
        </div>
      )}
    </div>
  )
}