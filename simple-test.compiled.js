import { Component, ref } from 'auwla';
const name = ref("World");
export default Component((ui) => {
    ui.Div({ className: "p-4" }, (ui) => {
        ui.H1({ text: "Hello" + String(name) + "!" });
        ui.Button({ text: "Click me", on: { click: () => name.value = "Auwla" } });
    });
});
