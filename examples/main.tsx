import { commit, createMemoApp,component } from 'auwla';
import type {} from 'auwla/jsx-runtime';
import './styles.css';


const state:any = {
  count: 0,
  double() { return this.count * 2 }
}

function CounterExample() {
    const self = component()
    return () => (
      <section class="panel">
        <h2>Counter</h2>
        <p>State is a local variable in setup.</p>
        <button onClick={() => { state.count++;  commit(self)}}>Count: {state.count}</button>
        <p>double {state.double()}</p>
      </section>
    );
}

function TodoExample() {
  const todos = [
    { id: 1, text: 'Learn Auwla', done: false },
  ];
  let newTodoText = '';

  function handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    const text = newTodoText.trim();
    if (!text) return;
    todos.push({ id: Date.now(), text, done: false });
    newTodoText = '';
  }

  return () => (
    <section class="panel">
      <h2>Todo List</h2>

      <form class="row" onSubmit={handleSubmit}>
        <input
          value={newTodoText}
          placeholder="Add a task"
          onInput={(event) => {
            newTodoText = (event.target as HTMLInputElement).value;
          }}
        />
        <button type="submit">Add</button>
      </form>

      {todos.length === 0 && <p>All tasks completed.</p>}

      <ul class="todo-list">
        {todos.map((todo) => (
          <li key={todo.id} class={todo.done ? 'done' : ''}>
            <label>
              <input
                type="checkbox"
                checked={todo.done}
                onChange={() => { todo.done = !todo.done; }}
              />
              <span>{todo.text}</span>
            </label>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ChildCounter(props: { label: string }) {
  let count = 0;
  console.log("run again")
  return () => (
    <button class="secondary" onClick={() => count++}>
      {props.label}: {count}
    </button>
  );
}

function Another(props: { label: string,counter:number }) {
  let count = 0;
  console.log("run again")
  return () => (
    <div>
    <button class="secondary" onClick={() => state.count++}>
      {props.label}: {state.count}
      </button>
      <p>double{ props.counter}</p>
      <ChildCounter label='Another child' />
    </div>
  );
}

function NestedStateExample() {
  let parentCount = 0;

  return () => (
    <section class="panel">
      <h2>Nested Components</h2>
      <p>Child setup runs once and keeps its own closure state across parent rerenders.</p>
      <div class="row">
        <button onClick={() => parentCount++}>Parent: {parentCount}</button>
        <ChildCounter label="Child A" />
        <ChildCounter label="Child B" />
        <Another label='Another parent' counter={parentCount}/>
      </div>
    </section>
  );
}

function KeyedReorderExample() {
  const items = [
    { id: 'a', label: 'Alpha' },
    { id: 'b', label: 'Beta' },
    { id: 'c', label: 'Gamma' },
  ];

  return () => (
    <section class="panel">
      <h2>Keyed Reorder</h2>
      <p>Same keys move existing DOM nodes instead of recreating them.</p>
      <button onClick={() => items.reverse()}>Reverse</button>
      <ol class="cards">
        {items.map((item) => (
          <li key={item.id}>{item.label}</li>
        ))}
      </ol>
    </section>
  );
}

function InputPatchExample() {
  let text = 'Edit me';
  let rerenders = 0;

  return () => {
    rerenders++;
    return (
      <section class="panel">
        <h2>Input Patching</h2>
        <p>Controlled input value is patched without replacing the input node.</p>
        <input
          value={text}
          onInput={(event) => {
            text = (event.target as HTMLInputElement).value;
          }}
        />
        <p>Text: {text}</p>
        <p>Render count: {rerenders}</p>
      </section>
    );
  };
}

function ExampleApp() {
  return () => (
    <main>
      <header>
        <h1>Auwla Examples</h1>
        <p>Plain variables, standard JSX, event-driven rerendering, DOM patching.</p>
      </header>

      <div class="grid">
        <CounterExample />
        <TodoExample />
        <NestedStateExample />
        <KeyedReorderExample />
        <InputPatchExample />
      </div>
    </main>
  );
}

createMemoApp(document.getElementById('app')!, <ExampleApp />);
