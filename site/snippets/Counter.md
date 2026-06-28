```tsx
export default function Counter() {
  let count = 0;

  return () => (
    <button onClick={() => count++}>
      Clicks: {count}
    </button>
  );
}
```
