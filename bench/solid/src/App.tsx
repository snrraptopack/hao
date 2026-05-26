import { createSignal, For, batch } from 'solid-js';
import "./styles.css"
type Row = {
  id: number;
  label: string;
};

const ADJECTIVES = ['pretty', 'large', 'big', 'small', 'tall', 'short', 'long', 'handsome', 'plain', 'quaint', 'clean', 'elegant', 'easy', 'angry', 'crazy', 'helpful', 'mushy', 'odd', 'unsightly', 'adorable', 'important', 'inexpensive', 'cheap', 'expensive', 'fancy'];
const COLOURS = ['red', 'yellow', 'blue', 'green', 'pink', 'brown', 'purple', 'brown', 'white', 'black', 'orange'];
const NOUNS = ['table', 'chair', 'house', 'bbq', 'desk', 'car', 'pony', 'cookie', 'sandwich', 'burger', 'pizza', 'mouse', 'keyboard'];

function random(max: number) {
  return Math.round(Math.random() * 1000) % max;
}

function makeLabel() {
  return `${ADJECTIVES[random(ADJECTIVES.length)]} ${COLOURS[random(COLOURS.length)]} ${NOUNS[random(NOUNS.length)]}`;
}

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

const TableBenchmark = () => {
  const [rows, setRows] = createSignal<Row[]>([]);
  const [selected, setSelected] = createSignal(0);
  const [lastAction, setLastAction] = createSignal('No run yet');
  const [mutationMs, setMutationMs] = createSignal(0);
  const [paintMs, setPaintMs] = createSignal(0);
  const [totalMs, setTotalMs] = createSignal(0);

  let nextId = 1;

  const buildRows = (count: number): Row[] => {
    const next: Row[] = [];
    for (let i = 0; i < count; i++) {
      next.push({ id: nextId++, label: makeLabel() });
    }
    return next;
  };

  const measure = async (action: string, mutate: () => void) => {
    const start = performance.now();
    mutate();
    const afterFlush = performance.now();

    await nextFrame();
    const afterPaint = performance.now();

    batch(() => {
      setLastAction(action);
      setMutationMs(afterFlush - start);
      setPaintMs(afterPaint - afterFlush);
      setTotalMs(afterPaint - start);
    });

    console.table({
      action,
      rows: rows().length,
      mutationMs: afterFlush - start,
      paintMs: afterPaint - afterFlush,
      totalMs: afterPaint - start,
    });
  };

  return (
    <main class="table-page">
      <h1>Solid Table Benchmark</h1>
      <p>Table-shaped benchmark matching the common JS framework benchmark operations.</p>

      <div class="table-controls">
        <button onClick={() => measure('Create 1,000 rows', () => {
          setSelected(0);
          setRows(buildRows(1000));
        })}>Create 1k</button>
        <button onClick={() => measure('Create 10,000 rows', () => {
          setSelected(0);
          setRows(buildRows(10000));
        })}>Create 10k</button>
        <button onClick={() => measure('Append 1,000 rows', () => {
          setRows(prev => [...prev, ...buildRows(1000)]);
        })}>Append 1k</button>
        <button onClick={() => measure('Update every 10th row', () => {
          setRows(prev => prev.map((row, i) =>
            i % 10 === 0 ? { ...row, label: row.label + ' !!!' } : row
          ));
        })}>Partial</button>
        <button onClick={() => measure('Update all rows', () => {
          setRows(prev => prev.map(row => ({ ...row, label: row.label + ' !' })));
        })}>Update all</button>
        <button onClick={() => measure('Swap rows 2 and 999', () => {
          setRows(prev => {
            if (prev.length <= 998) return prev;
            const next = [...prev];
            [next[1], next[998]] = [next[998]!, next[1]!];
            return next;
          });
        })}>Swap</button>
        <button onClick={() => measure('Clear rows', () => {
          setSelected(0);
          setRows([]);
        })}>Clear</button>
      </div>

      <div class="table-metrics">
        <span>{lastAction()}</span>
        <span>{rows().length} rows</span>
        <span>Mutation+Render {mutationMs().toFixed(2)}ms</span>
        <span>Paint {paintMs().toFixed(2)}ms</span>
        <span>Total {totalMs().toFixed(2)}ms</span>
      </div>

      <table class="benchmark-table">
        <tbody>
          <For each={rows()}>
            {(row) => (
              <tr class={selected() === row.id ? 'selected' : ''}>
                <td class="col-id">{row.id}</td>
                <td class="col-label">
                  <a onClick={() => measure('Select row', () => setSelected(row.id))}>
                    {row.label}
                  </a>
                </td>
                <td class="col-remove">
                  <button class="remove" onClick={() => measure('Remove row', () => {
                    setRows(prev => prev.filter(r => r.id !== row.id));
                    if (selected() === row.id) setSelected(0);
                  })}>x</button>
                </td>
                <td class="col-empty"></td>
              </tr>
            )}
          </For>
        </tbody>
      </table>
    </main>
  );
};

export default TableBenchmark;
