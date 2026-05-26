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
  let lastAction = 'No run yet';
  let mutationMs = 0;
  let renderMs = 0;
  let paintMs = 0;
  let totalMs = 0;

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
    mutationMs = performance.now() - start;

    const renderStart = performance.now();
    app.render();
    renderMs = performance.now() - renderStart;

    const paintStart = performance.now();
    await nextFrame();
    paintMs = performance.now() - paintStart;

    totalMs = performance.now() - start;
    lastAction = action;
    console.table({ action, rows: rows.length, mutationMs, renderMs, paintMs, totalMs });
    app.render();
  };

  return () => (
    <main class="table-page">
      <h1>Auwla Table Benchmark</h1>
      <p>Table-shaped benchmark matching the common JS framework benchmark operations.</p>

      <div class="table-controls">
        <button onClick={() => measure('Create 1,000 rows', () => {
          selected = 0;
          rows = buildRows(1000);
        })}>Create 1k</button>
        <button onClick={() => measure('Create 10,000 rows', () => {
          selected = 0;
          rows = buildRows(10000);
        })}>Create 10k</button>
        <button onClick={() => measure('Append 1,000 rows', () => {
          rows = rows.concat(buildRows(1000));
        })}>Append 1k</button>
        <button onClick={() => measure('Update every 10th row', () => {
          for (let i = 0; i < rows.length; i += 10) {
            rows[i]!.label += ' !!!';
          }
        })}>Partial</button>
        <button onClick={() => measure('Update all rows', () => {
          for (const row of rows) row.label += ' !';
        })}>Update 1k</button>
        <button onClick={() => measure('Swap rows 2 and 999', () => {
          if (rows.length > 998) {
            const second = rows[1]!;
            rows[1] = rows[998]!;
            rows[998] = second;
          }
        })}>Swap</button>
        <button onClick={() => measure('Clear rows', () => {
          selected = 0;
          rows = [];
        })}>Clear</button>
      </div>

      <div class="table-metrics">
        <span>{lastAction}</span>
        <span>{rows.length} rows</span>
        <span>Mutation {mutationMs.toFixed(2)}ms</span>
        <span>Render {renderMs.toFixed(2)}ms</span>
        <span>Paint {paintMs.toFixed(2)}ms</span>
        <span>Total {totalMs.toFixed(2)}ms</span>
      </div>

      <table class="benchmark-table">
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} class={selected === row.id ? 'selected' : ''}>
              <td class="col-id">{row.id}</td>
              <td class="col-label">
                <a onClick={() => measure('Select row', () => { selected = row.id; })}>{row.label}</a>
              </td>
              <td class="col-remove">
                <button class="remove" onClick={() => measure('Remove row', () => {
                  rows = rows.filter((candidate) => candidate.id !== row.id);
                  if (selected === row.id) selected = 0;
                })}>x</button>
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
