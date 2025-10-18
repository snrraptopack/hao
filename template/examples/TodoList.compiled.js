
import { Component, ref, watch } from '../../src/index.ts';

export default Component((ui) => {
  const todos = ref([
    { id: 1, text: ref('Learn Auwla'), done: ref(false) },
    { id: 2, text: ref('Build something cool'), done: ref(false) },
    { id: 3, text: ref('Ship it!'), done: ref(true) }
  ])
  
  const newTodo = ref('')
  const showCompleted = ref(true)
  
  function addTodo() {
    if (newTodo.value.trim()) {
      todos.value = [
        ...todos.value,
        { id: Date.now(), text: ref(newTodo.value), done: ref(false) }
      ]
      newTodo.value = ''
    }
  }
  
  function toggleTodo(todo) {
    todo.done.value = !todo.done.value
  }
  
  function toggleShowCompleted() {
    showCompleted.value = !showCompleted.value
  }

  ui.Div({ class: "max-w-2xl mx-auto p-6" }, (ui) => {
    ui.H1({ class: "text-3xl font-bold text-purple-600 mb-6", text: "Todo List" });
    ui.Div({ class: "mb-6 flex gap-2" }, (ui) => {
      ui.Input({ class: "flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500", placeholder: "What needs to be done?", value: newTodo, on: { input: (e) => newTodo.value = e.target.value } });
      ui.Button({ class: "px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition", text: "Add", on: { click: addTodo } });
    });
    ui.Div({ class: "mb-4" }, (ui) => {
      ui.Button({ class: "text-sm text-gray-600 hover:text-purple-600", text: watch(showCompleted, (v) => `${v ? 'Hide Completed' : 'Show All'}`), on: { click: toggleShowCompleted } });
    });
    ui.Ul({ class: "space-y-2" }, (ui) => {
      ui.List({
        items: todos,
        render: (todo, index, ui) => {
          const _whenCond1 = watch([showCompleted, todo.done], ([_v0, _v1]) => _v0 || !_v1);
          ui.When(_whenCond1, (ui) => {
            ui.Li({ class: "flex items-center gap-3 p-4 bg-white rounded-lg shadow hover:shadow-md transition" }, (ui) => {
          ui.Input({ type: "checkbox", class: "w-5 h-5 text-purple-600 rounded focus:ring-purple-500", checked: todo.done, on: { change: (e) => todo.done.value = e.target.checked } });
          ui.Span({ class: "flex-1", text: todo.text });
          ui.When(todo.done, (ui) => {
            ui.Span({ class: "px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full", text: "Done" });
          });
            });
          });
        }
      });
    });
  });
});
