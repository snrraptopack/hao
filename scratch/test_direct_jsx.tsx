export function Counter() {
  let count = 0;

  // Derived computed values are automatically detected and compiled to computed getters!
  let double = count * 2;

  // Side-effects trigger when dependencies change
  // Note: currently side-effects inside setup still need __effect wrapper
  // but let's check how the compiler handles this.
  return (
    <div>
      <button onClick={() => count++}>Count: {count}</button>
      <p>Double: {double}</p>
    </div>
  );
}
