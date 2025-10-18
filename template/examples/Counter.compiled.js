
import { Component, ref, watch } from '../../src/index.ts';

export default Component((ui) => {
  const count = ref(0)
  const userName = "John Doe"
  const userId = '1234'
  
  function increment() {
    count.value += 2
  }
  
  function decrement() {
    count.value--
  }

  ui.Div({ class: "counter" }, (ui) => {
    ui.H1({ text: watch(count, (v) => `Count: ${v}`) });
    ui.H3({ text: watch(count, (v) => `Count: ${v * 3}`) });
    ui.H2({ text: `User: ${userName}` });
    ui.P({ text: `ID: ${userId}` });
    ui.Button({ text: "+", on: { click: increment } });
    ui.Button({ text: "-", on: { click: decrement } });
  });
});
