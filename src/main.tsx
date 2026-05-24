import type {} from 'auwla/jsx-runtime';
import { createMemoApp } from 'auwla';

function Counter() {
  let count = 0;

  return () => (
    <main>
      <h1>Auwla</h1>
      <button onClick={() => count++}>Count: {count}</button>
    </main>
  );
}

createMemoApp(document.getElementById('app')!, <Counter />);
