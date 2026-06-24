import type {} from 'auwla/jsx-runtime';
import './styles.css';

function Button(props: { label: string; action: () => void }) {
  return () => (
    <section>
      <button onClick={props.action}>{props.label}</button>
    </section>
  );
}

class Data {
  #data: string[] = [];

  handleAdd(userInput: string) {
    if (userInput.trim() !== '') {
      this.data.push(userInput);
    }
  }
  handleDelete(item: string) {
    this.#data = this.#data.filter((it) => it !== item);
  }

  get data() {
    return this.#data;
  }

  get count() {
    return this.data.length;
  }
}

function ExampleApp() {
  const data = new Data();
  let currentInput = '';

  return () => (
    <section>
      <input
        type="text"
        placeholder="enter here"
        value={currentInput}
        onInput={(e) => currentInput = (e.target as HTMLInputElement).value}
      />
      <Button
        label="Add"
        action={() => {
          data.handleAdd(currentInput);
          currentInput = '';
        }}
      />
      <p>count {data.count}</p>

      {data.data.length === 0 && <p>No todo</p>}
      {data.data.length > 0 &&
        data.data.map((it) => (
          <div key={it}>
            <p>{it}</p>
            <Button
              label="delete"
              action={() => {
                data.handleDelete(it);
              }}
            />
          </div>
        ))}
    </section>
  );
}

export function JsxPatternsExample() {
  return () => <ExampleApp />;
}
