// @page /static-map
// Test case: .map() with static array (should use forEach)

const staticItems = [
  { id: 1, name: 'Static Item 1' },
  { id: 2, name: 'Static Item 2' },
  { id: 3, name: 'Static Item 3' }
]

export default function StaticMapPage() {
  return (
    <div className="p-8">
      <h1>Static Map Test</h1>
      
      <div className="mt-4">
        {/* This should compile to forEach() because staticItems is not a ref */}
        {staticItems.map(item => 
          <div key={item.id} className="p-2 border">
            {item.name}
          </div>
        )}
      </div>
    </div>
  )
}