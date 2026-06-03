import {  createMemoApp,component, emit, ComponentHandle } from 'auwla';
import type {} from 'auwla/jsx-runtime';
import './styles.css';

function Button(props: { lable: string,action:()=>void }) {

  return () => (
    <section>
      <button onClick={props.action}>{props.lable}</button>
    </section>
  )
}

function ExampleApp() {
  let data:string[] = []
  let currentInput = ""
  function handleAdd() {
    if (currentInput.trim() !== "") {
      data.push(currentInput)
      currentInput = ""
    }
  }
  function handleDelete(item:string) {
    data = data.filter((it)=> it !==item)
  }


  return () => (
    <section>
      <input
        type='text'
        placeholder='enter here'
        value={currentInput}
        onInput={(e) => currentInput = (e.target as HTMLInputElement).value}
      />
      <Button lable='Add' action={handleAdd} />

      {data.length === 0 && <p>No todo</p>}
      {data.length > 0 && data.map(it => (
        <div>
          <p>{it}</p>
          <Button lable='delete' action={()=>handleDelete(it)}/>
        </div>
      ))}
    </section>
  )
}

export function JsxPatternsExample() {
  return () => <ExampleApp />;
}
