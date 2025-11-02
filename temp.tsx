/** @jsx h */
import {h, ref, For, flushSync } from './src/index';

const adjectives = ["pretty", "large", "big", "small", "tall", "short", "long", "handsome", "plain", "quaint", "clean", "elegant", "easy", "angry", "crazy", "helpful", "mushy", "odd", "unsightly", "adorable", "important", "inexpensive", "cheap", "expensive", "fancy"];
const colors = ["red", "yellow", "blue", "green", "pink", "brown", "purple", "brown", "white", "black", "orange"];
const nouns = ["table", "chair", "house", "bbq", "desk", "car", "pony", "cookie", "sandwich", "burger", "pizza", "mouse", "keyboard"];

const random = (max: number) => Math.round(Math.random() * 1000) % max;

let nextId = 1;

interface RowData {
  id: number;
  label: string;
}

const buildData = (count: number): RowData[] => {
  const data: RowData[] = Array.from({ length: count });
  for (let i = 0; i < count; i++) {
    data[i] = {
      id: nextId++,
      label: `${adjectives[random(adjectives.length)]} ${colors[random(colors.length)]} ${nouns[random(nouns.length)]}`
    };
  }
  return data;
};

const Button = ({ id, text, fn }: { id: string; text: string; fn: () => void }) => (
  <div className="col-sm-6 smallpad">
    <button id={id} className="btn btn-primary btn-block" type="button" onClick={fn}>
      {text}
    </button>
  </div>
);

function App() {
  const data = ref<RowData[]>([]);
  const selected = ref<number | null>(null);

  const run = () => {
    data.value = buildData(1_000);
    selected.value = null;
  };

  const runLots = () => {
    data.value = buildData(10_000);
    selected.value = null;
  };

  const add = () => {
    data.value = [...data.value, ...buildData(1_000)];

  };

 
  const update = () => {
    data.value = data.value.map((item, i) => 
      i % 10 === 0 
        ? { ...item, label: item.label + ' !!!' } // New reference
        : item // Same reference (For optimization!)
    );
  };

  const clear = () => {
    data.value = [];
    selected.value = null;
  };

  const swapRows = () => {
    const list = data.value.slice();
    if (list.length > 998) {
      const temp = list[1];
      list[1] = list[998];
      list[998] = temp;
      data.value = list;
    
    }
  };

  const remove = (id: number) => {
    const idx = data.value.findIndex(d => d.id === id);
    data.value = [...data.value.slice(0, idx), ...data.value.slice(idx + 1)];
    
  };

  // ✅ FIXED: Force re-render to update selected class
  const select = (id: number) => {
    selected.value = id;
    data.value = [...data.value]; // Force re-render
    
  };

  return (
    <div className="container">
      <div className="jumbotron">
        <div className="row">
          <div className="col-md-6">
            <h1>Auwla</h1>
          </div>
          <div className="col-md-6">
            <div className="row">
              <Button id="run" text="Create 1,000 rows" fn={run} />
              <Button id="runlots" text="Create 10,000 rows" fn={runLots} />
              <Button id="add" text="Append 1,000 rows" fn={add} />
              <Button id="update" text="Update every 10th row" fn={update} />
              <Button id="clear" text="Clear" fn={clear} />
              <Button id="swaprows" text="Swap Rows" fn={swapRows} />
            </div>
          </div>
        </div>
      </div>
      <table className="table table-hover table-striped test-data">
        <tbody>
          <For each={data} key={(row)=> row.id}>
            {(row: RowData) => (
              <tr class={selected.value === row.id ? "danger" : ""}>
                <td class="col-md-1">{row.id}</td>
                <td class="col-md-4">
                  <a onClick={() => select(row.id)}>{row.label}</a>
                </td>
                <td class="col-md-1">
                  <a onClick={() => remove(row.id)}>
                    <span class="glyphicon glyphicon-remove" aria-hidden="true"></span>
                  </a>
                </td>
                <td class="col-md-6"></td>
              </tr>
            )}
          </For>
        </tbody>
      </table>
      <span className="preloadicon glyphicon glyphicon-remove" aria-hidden="true"></span>
    </div>
  );
}

const root = document.querySelector('#main')!;
root.append(<App />);