import { createMemoApp, component, commit } from 'auwla';
import type {} from 'auwla/jsx-runtime';
import './styles.css';

type Row = {
  id: number;
  label: string;
};

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
  const self = component();
  let rows: Row[] = [];
  let nextId = 1;
  let selected = 0;
  let actionMetric = 'No run yet';
  let rowsMetric = '0 rows';
  let mutationRenderMetric = 'Mutation+Render 0.00ms';
  let paintMetric = 'Paint 0.00ms';
  let totalMetric = 'Total 0.00ms';

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
    const mutationRenderMs = performance.now() - start;

    await nextFrame();
    const paintMs = performance.now() - start - mutationRenderMs;
    const totalMs = performance.now() - start;

    actionMetric = action;
    rowsMetric = `${rows.length} rows`;
    mutationRenderMetric = `Mutation+Render ${mutationRenderMs.toFixed(2)}ms`;
    paintMetric = `Paint ${paintMs.toFixed(2)}ms`;
    totalMetric = `Total ${totalMs.toFixed(2)}ms`;

    console.table({ action, rows: rows.length, mutationRenderMs, paintMs, totalMs });
    commit(self);
  };

  return () => (
    <main class="table-page">
      <h1>Auwla Table Benchmark — RUNTIME PATH</h1>
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
        })}>Update all</button>
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
        <span>{actionMetric}</span>
        <span>{rowsMetric}</span>
        <span>{mutationRenderMetric}</span>
        <span>{paintMetric}</span>
        <span>{totalMetric}</span>
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

export function TableBenchmarkRuntimeExample() {
  return () => <TableBenchmark />;
}
