import { component } from 'auwla';

export function DirectCounter() {
  let count = 0;

  return (
    <div>
      <p>Count is: {count}</p>
      <button onClick={() => { count++; }}>Increment</button>
    </div>
  );
}
