import { Component } from 'auwla';
export default Component((ui) => {
    ui.Div({ className: "p-6 max-w-md mx-auto bg-white rounded-xl shadow-lg" }, (ui) => {
        ui.H1({ text: String(message), className: "text-2xl font-bold text-gray-900 mb-4" });
        ui.Div({ className: "flex items-center gap-4 mb-4" }, (ui) => {
            ui.Button({ text: "-", className: "px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600", on: { click: () => count.value-- } });
            ui.Span({ text: "Count:" + String(count), className: "text-xl font-semibold" });
            ui.Button({ text: "+", className: "px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600", on: { click: () => count.value++ } });
        });
        ui.Div({ className: "space-y-2" }, (ui) => {
            ui.Input({ type: "text", className: "w-full px-3 py-2 border border-gray-300 rounded", placeholder: "Enter a message", on: { input: e => message.value = e.target.value } });
            ui.Div({ text: "Current message:" + String(message), className: "text-sm text-gray-600" });
        });
        ui.Text({ value: () => String(count.value > 5 && <div className="mt-4 p-3 bg-yellow-100 border border-yellow-400 rounded">
          Wow! You've clicked {count} times!
        </div>) });
    });
});
