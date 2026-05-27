import { createMemoApp } from 'auwla';
import type {} from 'auwla/jsx-runtime';
import './styles.css';

type Row = {
  id: number;
  label: string;
};

let app: any = null;
const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

const ADJECTIVES = ['pretty', 'large', 'big', 'small', 'tall', 'short', 'long', 'handsome', 'plain', 'quaint', 'clean', 'elegant', 'easy', 'angry', 'crazy', 'helpful', 'mushy', 'odd', 'unsightly', 'adorable', 'important', 'inexpensive', 'cheap', 'expensive', 'fancy'];
const COLOURS = ['red', 'yellow', 'blue', 'green', 'pink', 'brown', 'purple', 'brown', 'white', 'black', 'orange'];
const NOUNS = ['table', 'chair', 'house', 'bbq', 'desk', 'car', 'pony', 'cookie', 'sandwich', 'burger', 'pizza', 'mouse', 'keyboard'];

function random(max: number) {
  return Math.round(Math.random() * 1000) % max;
}

function label() {
  return `${ADJECTIVES[random(ADJECTIVES.length)]} ${COLOURS[random(COLOURS.length)]} ${NOUNS[random(NOUNS.length)]}`;
}

function TableBenchmark() {
  let rows: Row[] = [];
  let nextId = 1;
  let selected = 0;
  let actionMetric: HTMLSpanElement | null = null;
  let rowsMetric: HTMLSpanElement | null = null;
  let mutationRenderMetric: HTMLSpanElement | null = null;
  let paintMetric: HTMLSpanElement | null = null;
  let totalMetric: HTMLSpanElement | null = null;

  const buildRows = (count: number) => {
    const next: Row[] = [];
    for (let i = 0; i < count; i++) {
      next.push({ id: nextId++, label: label() });
    }
    return next;
  };

  const measure = async (action: string, mutate: () => void) => {
    const start = performance.now();
    mutate();
    // Benchmark-only: force the synchronous DOM flush here so this measures
    // the same "mutation + render" phase as Solid's signal update benchmark.
    // Normal Auwla app code should use onClick and let events auto-rerender.
    app.render();
    const afterFlush = performance.now();

    await nextFrame();
    const afterPaint = performance.now();

    const mutationRenderMs = afterFlush - start;
    const paintMs = afterPaint - afterFlush;
    const totalMs = afterPaint - start;

    if (actionMetric) actionMetric.textContent = action;
    if (rowsMetric) rowsMetric.textContent = `${rows.length} rows`;
    if (mutationRenderMetric) mutationRenderMetric.textContent = `Mutation+Render ${mutationRenderMs.toFixed(2)}ms`;
    if (paintMetric) paintMetric.textContent = `Paint ${paintMs.toFixed(2)}ms`;
    if (totalMetric) totalMetric.textContent = `Total ${totalMs.toFixed(2)}ms`;

    console.table({ action, rows: rows.length, mutationRenderMs, paintMs, totalMs });
  };

  // Benchmark-only: raw DOM handlers avoid Auwla's automatic event invalidation.
  // `measure()` already calls app.render(), so using onClick here would add a
  // second framework-scheduled render that Solid's benchmark does not perform.
  const run = (action: string, mutate: () => void) => () => {
    void measure(action, mutate);
  };

  return () => (
    <main class="table-page">
      <h1>Auwla Table Benchmark</h1>
      <p>Table-shaped benchmark matching the common JS framework benchmark operations.</p>

      <div class="table-controls">
        <button ref={(button) => { button.onclick = run('Create 1,000 rows', () => {
          selected = 0;
          rows = buildRows(1000);
        }); }}>Create 1k</button>
        <button ref={(button) => { button.onclick = run('Create 10,000 rows', () => {
          selected = 0;
          rows = buildRows(10000);
        }); }}>Create 10k</button>
        <button ref={(button) => { button.onclick = run('Append 1,000 rows', () => {
          rows = rows.concat(buildRows(1000));
        }); }}>Append 1k</button>
        <button ref={(button) => { button.onclick = run('Update every 10th row', () => {
          for (let i = 0; i < rows.length; i += 10) {
            rows[i]!.label += ' !!!';
          }
        }); }}>Partial</button>
        <button ref={(button) => { button.onclick = run('Update all rows', () => {
          for (const row of rows) row.label += ' !';
        }); }}>Update all</button>
        <button ref={(button) => { button.onclick = run('Swap rows 2 and 999', () => {
          if (rows.length > 998) {
            const second = rows[1]!;
            rows[1] = rows[998]!;
            rows[998] = second;
          }
        }); }}>Swap</button>
        <button ref={(button) => { button.onclick = run('Clear rows', () => {
          selected = 0;
          rows = [];
        }); }}>Clear</button>
      </div>

      <div class="table-metrics">
        <span ref={(span) => { actionMetric = span; }}>No run yet</span>
        <span ref={(span) => { rowsMetric = span; }}>0 rows</span>
        <span ref={(span) => { mutationRenderMetric = span; }}>Mutation+Render 0.00ms</span>
        <span ref={(span) => { paintMetric = span; }}>Paint 0.00ms</span>
        <span ref={(span) => { totalMetric = span; }}>Total 0.00ms</span>
      </div>

      <table class="benchmark-table">
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} class={selected === row.id ? 'selected' : ''}>
              <td class="col-id">{row.id}</td>
              <td class="col-label">
                <a ref={(link) => { link.onclick = run('Select row', () => { selected = row.id; }); }}>{row.label}</a>
              </td>
              <td class="col-remove">
                <button class="remove" ref={(button) => { button.onclick = run('Remove row', () => {
                  rows = rows.filter((candidate) => candidate.id !== row.id);
                  if (selected === row.id) selected = 0;
                }); }}>x</button>
              </td>
              <td class="col-empty"></td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}

const root = document.getElementById('app');
if (root) {
  app = createMemoApp(root, <TableBenchmark />);
}
