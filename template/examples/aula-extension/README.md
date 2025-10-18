# Auwla VS Code Extension

Language support for `.auwla` files - a JSX-like syntax for the Auwla framework.

## Features

- ✅ **Syntax highlighting** for `.auwla` files with JSX support
- ✅ **Auto-completion** for:
  - Auwla APIs (`ref`, `watch`, `Component`)
  - Control flow (`$if`, `$each`)
  - JSX tags (`div`, `span`, `button`, `input`, etc.)
- ✅ **Hover documentation** with type signatures
- ✅ **Signature help** for function parameters
- ✅ **Auto-closing** brackets, quotes, and JSX tags
- ✅ **Custom file icon** for `.auwla` files
- ✅ **TypeScript IntelliSense** in both `<script>` and template sections

## Setup for TypeScript IntelliSense

To get full TypeScript support in your `.auwla` files:

1. **Create a `jsconfig.json` or `tsconfig.json`** in your project root:

```json
{
  "compilerOptions": {
    "jsx": "react",
    "jsxFactory": "ui",
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020", "DOM"],
    "strict": true,
    "esModuleInterop": true,
    "moduleResolution": "node",
    "typeRoots": ["./node_modules/@types", "./types"]
  },
  "include": ["**/*.auwla", "**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules"]
}
```

2. **Copy type definitions** from `template/examples/aula-extension/types/auwla.d.ts` to your project's `types/` folder

3. **Reload VS Code** (Cmd+Shift+P → "Developer: Reload Window")

Now you'll get:
- ✅ Autocomplete for `ref()`, `watch()`, `Component()`
- ✅ Type checking for function parameters
- ✅ IntelliSense in JSX expressions
- ✅ Import suggestions for Auwla modules

## Development

### Setup

```bash
bun install
```

### Run Extension

1. Press `F5` to open a new VS Code window with the extension loaded
2. Open a `.auwla` file to test
3. Change the language mode to "Auwla" if needed (bottom-right corner)

### Compile

```bash
bun run compile
```

### Watch Mode

```bash
bun run watch
```

## File Format

`.auwla` files use a two-part structure:

1. **`<script>` section**: TypeScript imports, interfaces, state, and functions
2. **Component function(s)**: JSX-like syntax with PascalCase naming

### Example

```auwla
<script>
import { ref } from 'auwla'
import { if as $if, each as $each } from 'auwla/template'

interface Todo {
  id: number
  text: string
  done: boolean
}

const todos = ref<Todo[]>([])
const newTodo = ref('')

function addTodo() {
  todos.value = [...todos.value, {
    id: Date.now(),
    text: newTodo.value,
    done: false
  }]
  newTodo.value = ''
}
</script>

function TodoList() {
  return (
    <div class="todo-app">
      <h1>Todo List</h1>
      
      <div class="input-section">
        <input 
          type="text" 
          value={newTodo}
          placeholder="Add a todo"
        />
        <button onClick={addTodo}>Add</button>
      </div>
      
      <ul class="todo-list">
        {$each(todos.value, (todo) => (
          <li key={todo.id}>
            <span>{todo.text}</span>
          </li>
        ))}
      </ul>
      
      {$if(todos.value.length === 0, () => (
        <p>No todos yet!</p>
      ))}
    </div>
  )
}
```

## Syntax Reference

### Control Flow

- **`$if(condition, () => <jsx>)`** - Conditional rendering
- **`$each(items, (item) => <jsx>)`** - List rendering with key support

### Reactivity

- **`ref(value)`** - Create reactive reference
- **`watch([deps], callback)`** - Watch reactive dependencies

### Props & Events

- **Props**: `class="..."`, `value={ref}`, `checked={bool}`
- **Events**: `onClick={handler}`, `onInput={handler}`

## Troubleshooting

### No IntelliSense in .auwla files

1. Ensure language mode is set to "Auwla" (bottom-right status bar)
2. Create `jsconfig.json` or `tsconfig.json` with the configuration above
3. Copy type definitions to your project
4. Reload VS Code window

### Red squiggly lines in JSX

- This is expected if the language mode is still "TypeScript" or "TypeScript React"
- Change to "Auwla" language mode
- The Auwla compiler will handle the transformation

### Extension not activating

- Check the Output panel (View → Output → Select "Auwla" from dropdown)
- Look for activation messages in the console

## Publishing

1. Update version in `package.json`
2. Create VSIX package:
   ```bash
   npx vsce package
   ```
3. Publish to marketplace:
   ```bash
   npx vsce publish
   ```

## License

MIT

