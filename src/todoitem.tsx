import { h } from "./jsx";
import { ref, watch, type Ref } from "./state";

type Todo = {
  id: number;
  text: Ref<string>;
  done: Ref<boolean>;
};

interface TodoItemProps {
  todo: Todo;
  editing: Ref<boolean>;
  onToggle: () => void;
  onDelete: () => void;
  onStartEdit: () => void;
  onSave: (value: string) => void;
  onCancel: () => void;
}

export function TodoItem(props: TodoItemProps): HTMLElement {
  const { todo, editing, onToggle, onDelete, onStartEdit, onSave, onCancel } = props;
  const editText = ref("");

  // When editing begins, seed input with current text
  watch(editing, (isEditing) => {
    if (isEditing) editText.value = todo.text.value;
  });

  const textClasses = watch(todo.done, (d) => (d ? "line-through text-gray-500" : "text-gray-900"));

  const onKeyDown = (e: any) => {
    if (e.key === "Enter") {
      onSave(editText.value.trim());
    } else if (e.key === "Escape") {
      onCancel();
    }
  };

  return (
    <li class="flex items-center gap-2 py-1">
      <input type="checkbox" checked={todo.done} onChange={onToggle} class="size-4 accent-blue-600" />

      {watch(editing, (isEditing) =>
        isEditing ? (
          <input
            type="text"
            value={editText}
            onInput={(e: any) => (editText.value = e.target.value)}
            onKeyDown={onKeyDown}
            onBlur={() => onSave(editText.value.trim())}
            class="flex-1 px-2 py-1 border rounded outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Edit todo"
            autofocus
          />
        ) : (
          <span class={textClasses}>
            {todo.text}
          </span>
        )
      )}

      {watch(editing, (isEditing) =>
        isEditing ? (
          <button onClick={() => onSave(editText.value.trim())} class="ml-auto px-2 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">
            Save
          </button>
        ) : (
          <div class="ml-auto flex items-center gap-2">
            <button onClick={onStartEdit} class="px-2 py-1 text-sm border rounded hover:bg-gray-100">Edit</button>
            <button onClick={onDelete} class="px-2 py-1 text-sm text-red-600 border border-red-200 rounded hover:bg-red-50">✕</button>
          </div>
        )
      )}
    </li>
  ) as unknown as HTMLElement;
}