import {} from "auwla/jsx-runtime"
import { createMemoApp, h } from "auwla"

function Parent() {
  let count = 0;
  return () => (
    <div>
      <button id="parentBtn" onClick={() => count++}>Parent: {count}</button>
      <Child counter={count} />
    </div>
  );
}

function Child(props: { counter: number }) {
  return () => <span id="child">{props.counter}</span>;
}

const root = document.getElementById('app')!;
createMemoApp(root, <Parent />);

console.log('initial child:', document.getElementById('child')!.textContent);
document.getElementById('parentBtn')!.click();
await new Promise(r => setTimeout(r, 50));
console.log('after click child:', document.getElementById('child')!.textContent);
