// @page /cart
// E-commerce cart with complex conditional rendering and loops

import { ref, computed, type Ref } from 'auwla'

const cartItems = ref([
  { id: 1, name: 'Laptop', price: 999, quantity: 1, inStock: true, category: 'electronics' },
  { id: 2, name: 'Mouse', price: 29, quantity: 2, inStock: true, category: 'electronics' },
  { id: 3, name: 'Book', price: 15, quantity: 1, inStock: false, category: 'books' }
])
const user = ref({ isLoggedIn: true, isPremium: false, address: null })
const promoCode = ref('')
const isCheckingOut = ref(false)
const shippingMethod = ref('standard')
const showPromoInput = ref(false)

const totalItems = computed(() => 
  cartItems.value.reduce((sum, item) => sum + item.quantity, 0)
)
const subtotal = computed(() => 
  cartItems.value.reduce((sum, item) => sum + (item.price * item.quantity), 0)
)
const hasOutOfStockItems = computed(() => 
  cartItems.value.some(item => !item.inStock)
)

export default function CartPage() {
  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1>Shopping Cart</h1>
      
      {/* Empty cart state */}
      {cartItems.value.length === 0 ? (
        <div className="text-center py-12">
          <h2 className="text-xl text-gray-600">Your cart is empty</h2>
          <p className="text-gray-500 mt-2">Add some items to get started!</p>
          <button className="mt-4 bg-blue-500 text-white px-6 py-2 rounded">
            Continue Shopping
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart items */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow">
              <div className="p-4 border-b">
                <h2>Items ({totalItems.value})</h2>
              </div>
              
              {/* Item list */}
              <div className="divide-y">
                {cartItems.value.map(item => (
                  <div key={item.id} className="p-4">
                    <div className="flex items-center space-x-4">
                      <div className="flex-1">
                        <h3 className="font-medium">{item.name}</h3>
                        <p className="text-sm text-gray-500">Category: {item.category}</p>
                        
                        {/* Stock status */}
                        {item.inStock ? (
                          <span className="inline-block px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                            In Stock
                          </span>
                        ) : (
                          <span className="inline-block px-2 py-1 bg-red-100 text-red-800 text-xs rounded">
                            Out of Stock
                          </span>
                        )}
                        
                        {/* Premium user benefits */}
                        {$if((user.value.isPremium && item.category === 'electronics')) && (
                          <span className="ml-2 px-2 py-1 bg-gold-100 text-gold-800 text-xs rounded">
                            Premium Discount Applied
                          </span>
                        )}
                      </div>
                      
                      <div className="text-right">
                        <p className="font-medium">${item.price}</p>
                        <div className="flex items-center mt-2">
                          <button 
                            className="w-8 h-8 rounded-full border flex items-center justify-center"
                            disabled={!item.inStock}
                          >
                            -
                          </button>
                          <span className="mx-3">{item.quantity}</span>
                          <button 
                            className="w-8 h-8 rounded-full border flex items-center justify-center"
                            disabled={!item.inStock}
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    {/* Item-specific warnings */}
                    {!item.inStock && (
                      <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded">
                        <p className="text-sm text-yellow-800">
                          This item is currently out of stock and will be removed at checkout.
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          {/* Order summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-6 sticky top-6">
              <h3 className="text-lg font-medium mb-4">Order Summary</h3>
              
              <div className="space-y-2 mb-4">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>${subtotal.value}</span>
                </div>
                
                {/* Premium user discount */}
                {user.value.isPremium && (
                  <div className="flex justify-between text-green-600">
                    <span>Premium Discount</span>
                    <span>-$10</span>
                  </div>
                )}
                
                {/* Shipping options */}
                <div className="border-t pt-2">
                  <p className="font-medium mb-2">Shipping</p>
                  <div className="space-y-1">
                    <label className="flex items-center">
                      <input 
                        type="radio" 
                        name="shipping" 
                        value="standard"
                        checked={shippingMethod.value === 'standard'}
                        onChange={() => shippingMethod.value = 'standard'}
                      />
                      <span className="ml-2">Standard (5-7 days) - Free</span>
                    </label>
                    
                    {/* Premium users get express shipping */}
                    {user.value.isPremium ? (
                      <label className="flex items-center">
                        <input 
                          type="radio" 
                          name="shipping" 
                          value="express"
                          checked={shippingMethod.value === 'express'}
                          onChange={() => shippingMethod.value = 'express'}
                        />
                        <span className="ml-2">Express (1-2 days) - Free (Premium)</span>
                      </label>
                    ) : (
                      <label className="flex items-center">
                        <input 
                          type="radio" 
                          name="shipping" 
                          value="express"
                          checked={shippingMethod.value === 'express'}
                          onChange={() => shippingMethod.value = 'express'}
                        />
                        <span className="ml-2">Express (1-2 days) - $15</span>
                      </label>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Promo code section */}
              <div className="border-t pt-4 mb-4">
                {showPromoInput.value ? (
                  <div>
                    <input 
                      type="text" 
                      placeholder="Enter promo code"
                      value={promoCode.value}
                      onChange={(e) => promoCode.value = e.target.value}
                      className="w-full border rounded px-3 py-2 mb-2"
                    />
                    <div className="flex space-x-2">
                      <button className="flex-1 bg-blue-500 text-white py-2 rounded">
                        Apply
                      </button>
                      <button 
                        className="px-4 py-2 border rounded"
                        onClick={() => showPromoInput.value = false}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button 
                    className="text-blue-500 text-sm"
                    onClick={() => showPromoInput.value = true}
                  >
                    Have a promo code?
                  </button>
                )}
              </div>
              
              {/* Checkout button */}
              <div className="space-y-3">
                {/* Login prompt for guests */}
                {!user.value.isLoggedIn && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                    <p className="text-sm text-blue-800">
                      Sign in for faster checkout and order tracking
                    </p>
                    <button className="mt-2 text-blue-600 text-sm font-medium">
                      Sign In
                    </button>
                  </div>
                )}
                
                {/* Out of stock warning */}
                {hasOutOfStockItems.value && (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
                    <p className="text-sm text-yellow-800">
                      Some items are out of stock and will be removed at checkout.
                    </p>
                  </div>
                )}
                
                {/* Checkout button with conditional states */}
                {isCheckingOut.value ? (
                  <button 
                    className="w-full bg-gray-400 text-white py-3 rounded cursor-not-allowed"
                    disabled
                  >
                    Processing...
                  </button>
                ) : hasOutOfStockItems.value ? (
                  <button className="w-full bg-yellow-500 text-white py-3 rounded">
                    Continue with Available Items
                  </button>
                ) : (
                  <button className="w-full bg-green-500 text-white py-3 rounded">
                    Proceed to Checkout
                  </button>
                )}
                
                {/* Security badges for logged in users */}
                {user.value.isLoggedIn && (
                  <div className="flex justify-center space-x-4 text-xs text-gray-500">
                    <span>🔒 Secure Checkout</span>
                    <span>📦 Free Returns</span>
                    {user.value.isPremium && <span>⭐ Premium Support</span>}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}