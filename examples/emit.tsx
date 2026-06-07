import { component, emit } from 'auwla';
import type {} from 'auwla/jsx-runtime';
import './styles/emit.css';

// ─── Data ───────────────────────────────────────────────────────────────────

const PRODUCTS = [
  { id: 'p1', name: 'Wireless Mouse', price: 29.99 },
  { id: 'p2', name: 'Mechanical Keyboard', price: 89.99 },
  { id: 'p3', name: 'USB-C Hub', price: 45.5 },
  { id: 'p4', name: 'Webcam 4K', price: 119.0 },
  { id: 'p5', name: 'Desk Lamp LED', price: 34.99 },
  { id: 'p6', name: 'Monitor Stand', price: 59.0 },
];

// ─── Types ──────────────────────────────────────────────────────────────────

type CartItem = { id: string; name: string; price: number };

// ─── Child Component ────────────────────────────────────────────────────────

/**
 * ProductCard — a reusable product card.
 *
 * When "Add to Cart" is clicked, it emits an 'addToCart' event
 * with the product payload. The parent listens via emit:addToCart.
 */
function ProductCard(props: { product: typeof PRODUCTS[number] }) {
  const self = component();
  const { product } = props;

  return () => (
    <div class="card">
      <h3>{product.name}</h3>
      <div class="price">${product.price.toFixed(2)}</div>
      <button
        onClick={() => {
          // Emit takes three arguments:
          //   1. self — the handle from component()
          //   2. 'addToCart' — the custom event name
          //   3. payload — any data you want to send upward
          emit(self, 'addToCart', {
            id: product.id,
            name: product.name,
            price: product.price,
          });
        }}
      >
        Add to Cart
      </button>

    </div>
  );
}

// ─── Parent Component ───────────────────────────────────────────────────────

/**
 * CartApp — listens for 'addToCart' events from child ProductCards.
 *
 * The emit:addToCart listener receives the payload directly (not a
 * browser Event). Each emission appends the item to the cart array.
 */
function CartApp() {
  const cart: CartItem[] = [];
  return () => (
    <div class="emit-example">
      <h1>emit() Example</h1>
      <p class="subtitle">
        Click "Add to Cart" on any product. The ProductCard child emits
        an event that bubbles up to the parent.
      </p>

      <div
        class="layout"
        emit:addToCart={(item: CartItem) => {
          cart.push(item);
        }}
      >
        {/* Product grid */}
        <div class="products">
          {PRODUCTS.map((product) => (
            <ProductCard product={product} />
          ))}
        </div>

        {/* Cart sidebar — listens for the emitted event */}
        <div class="cart">
          <h2>🛒 Cart ({cart.length})</h2>

          {cart.length === 0 ? (
            <p class="empty">Your cart is empty</p>
          ) : (
            <div>
              {cart.map((item) => (
                <div key={`${item.id}`} class="cart-item">
                  <span>{item.name}</span>
                  <span>${item.price.toFixed(2)}</span>
                </div>
              ))}
              <div class="cart-total">
                <span>Total</span>
                <span>
                  ${cart.reduce((sum, item) => sum + item.price, 0).toFixed(2)}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div class="code-hint">
        <strong>How it works:</strong>
        <ul style={{ margin: '8px 0', paddingLeft: '18px' }}>
          <li>
            Child calls <code>emit(self, 'addToCart', payload)</code> —
            <code>self</code> comes from <code>component()</code>.
          </li>
          <li>
            Parent listens with <code>emit:addToCart={'{(item) => ...}'}</code> —
            receives the payload directly, no <code>event.detail</code> needed.
          </li>
          <li>
            Events bubble like DOM events, so ancestors at any level can listen.
          </li>
        </ul>
        <pre>{`// Child
const self = component();
emit(self, 'addToCart', { id, name, price });

// Parent
<div emit:addToCart={(item) => cart.push(item)}>
  <ProductCard />
</div>`}</pre>
      </div>
    </div>
  );
}

export function EmitExample() {
  return () => <CartApp />;
}
