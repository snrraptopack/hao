import { ref } from './state'
import { h, Fragment } from './index'

export function Counter() {
  const count = ref(0)

  const inc = () => { count.value = count.value + 1 }
  const dec = () => { count.value = count.value - 1 }
  const reset = () => { count.value = 0 }

  return (
    <div class="counter" style={{ fontFamily: 'system-ui, sans-serif', padding: '1rem' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>Counter</h1>
      <p style={{ marginBottom: '0.75rem' }}>Value: {count}</p>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button onClick={dec} style={{ padding: '0.5rem 0.75rem' }}>-</button>
        <button onClick={inc} style={{ padding: '0.5rem 0.75rem' }}>+</button>
        <button onClick={reset} style={{ padding: '0.5rem 0.75rem' }}>Reset</button>
      </div>
    </div>
  ) as unknown as HTMLElement
}

const app = document.getElementById("app")

if(app) app.append(Counter())
