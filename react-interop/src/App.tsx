import { ref } from 'auwla';
import { ReactIsland } from 'auwla';
import ReactHello from './ReactHello';

export default function App(): HTMLElement {
  const title = ref('Hello from AUWLA → React');
  const count = ref(0);

  return (
    <div className="stack">
      <h1>AUWLA ↔ React Interop</h1>
      <p>This demo mounts a React component inside an AUWLA component tree.</p>

      <div className="card">
        <label>
          Title:
          <input
            type="text"
            value={title}
            onInput={(e: any) => { title.value = e.target.value; }}
            style={{ marginLeft: '8px' }}
          />
        </label>
      </div>

      <div className="card">
        <button onClick={() => { count.value++; }}>
          Increment in AUWLA (count = {count})
        </button>
      </div>

      <div className="card">
        <h2>React Island</h2>
        <ReactIsland component={ReactHello} props={{
          title,
          count,
          onIncrement: () => { count.value++; }
        }} />
      </div>
    </div>
  ) as any as HTMLElement;
}
/** @jsxImportSource auwla */