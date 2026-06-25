
export function TodoItem(props: { id: number; text: string; done: boolean; onToggle: () => void, }) {
    return () => (
        <li class={props.done ? 'completed' : ''}>
            <label>
                <input type="checkbox" checked={props.done} onChange={() => {
                    console.log(props.id)
                    props.onToggle()
                }} />
                <span>{props.text}</span>
            </label>
        </li>
    );
}

export function TodoApp() {
    const todos: { id: number; text: string; done: boolean }[] = [];
    let newTodoText = '';

    // Generate 500 items to start
    for (let i = 0; i < 500; i++) {
        todos.push({ id: i, text: `Item ${i}`, done: false });
    }

    function handleAdd() {
        todos.push({ id: Date.now(), text: 'New Item', done: false });
    }

    return () => (
        <div>
            <input bind={newTodoText} />
            <button onClick={handleAdd}>Add</button>
            <ul>
                {todos.map((todo) => (
                    <TodoItem

                        id={todo.id}
                        text={todo.text}
                        done={todo.done}
                        onToggle={() => {
                            todo.done = !todo.done;
                        }}
                    />
                ))}
            </ul>
        </div>
    );
}

// Controller page to mount, unmount, run GC, and track memory
function LeakTestPage() {
    let isMounted = false;
    let status = 'Idle';
    let memoryHistory: { step: number; heap: number }[] = [];
    let currentHeap = 0;

    async function runSuite() {
        status = 'Running test loop (500 cycles)...';
        memoryHistory = [];

        // Force a small delay for DOM tasks to settle
        const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

        for (let i = 1; i <= 500; i++) {
            // 1. Mount App
            isMounted = true;
            await sleep(5);

            // 2. Trigger updates (checkbox toggling, input binding, re-renders)
            // (This will execute event wrapper updates and closures)

            // 3. Unmount App
            isMounted = false;
            await sleep(5);

            // 4. Request Garbage Collection and measure
            if (typeof window !== 'undefined' && (window as any).gc) {
                (window as any).gc();
            }

            if (typeof window !== 'undefined' && (window as any).performance?.memory) {
                currentHeap = (window as any).performance.memory.usedJSHeapSize;
                if (i % 50 === 0 || i === 1 || i === 500) {
                    memoryHistory.push({ step: i, heap: currentHeap });
                }
            }
        }

        status = 'Done! Check memory graph values.';
    }

    return () => (
        <div style="padding: 2rem;">
            <h1>Auwla GC Memory Profiler</h1>
            <p>Status: <strong>{status}</strong></p>

            {/* Button to execute the automated mount/unmount simulation */}
            <div style="margin: 1rem 0;">
                <button class="btn primary" onClick={runSuite}>
                    Start 500 Cycle Test
                </button>
                {!(window as any).gc && (
                    <p style="color: red; font-size: 0.85rem;">
                        ⚠️ window.gc() is not exposed. See instructions below to enable GC profiling.
                    </p>
                )}
            </div>

            <div style="display: flex; gap: 2rem;">
                <div>
                    <h3>Memory History (Bytes)</h3>
                    <ul>
                        {memoryHistory.map((item) => (
                            <li key={item.step}>
                                Cycle {item.step}: <strong>{item.heap.toLocaleString()} bytes</strong>
                            </li>
                        ))}
                    </ul>
                </div>

                <div style="border: 1px solid #ccc; padding: 1rem; flex: 1;">
                    <h3>App Container</h3>
                    <div style="border: 1px dashed #666; min-height: 100px; padding: 0.5rem;">
                        {isMounted ? <TodoApp /> : <p style="color: gray;">[TodoApp Unmounted]</p>}
                    </div>
                </div>
            </div>
        </div>
    );
}


