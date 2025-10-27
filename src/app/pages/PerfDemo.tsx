import { h } from '../../jsx'
import { ref, watch } from '../../state'
import { onMount } from '../../lifecycle'

function heavyCompute(iterations: number): number {
  // CPU-bound work to simulate an expensive operation
  let acc = 0;
  for (let i = 0; i < iterations; i++) {
    acc += Math.sin(i) * Math.sqrt((i % 1024) + 1);
  }
  return acc;
}

export function PerfDemo(): HTMLElement {
  const clicks = ref(0);
  const size = ref(100_000);
  const result = ref(0);
  const durationMs = ref(0);
  const tick = ref(0);

  // Background tick to demonstrate independent fine-grained updates
  onMount(() => {
    const id = setInterval(() => {
      tick.value++;
    }, 50);
    return () => clearInterval(id);
  });

  // Recompute only when `size` changes; counter/tick updates do not trigger this
  watch(size, (n) => {
    const start = performance.now();
    const r = heavyCompute(n as number);
    const end = performance.now();
    result.value = r;
    durationMs.value = Math.round(end - start);
  });

  // Derived value from clicks for display (memoized via watch)
  const doubled = watch(clicks, (c) => (c as number) * 2);

  return (
    <div class="space-y-6">
      <h2 class="text-2xl font-bold">Performance Demo</h2>

      <div class="grid md:grid-cols-2 gap-6">
        <div class="space-y-3 p-4 border rounded">
          <h3 class="font-semibold">Counter (fast updates)</h3>
          <div class="text-lg">Clicks: {clicks}</div>
          <div class="text-sm text-gray-600">Doubled (derived): {doubled}</div>
          <div class="flex gap-2 pt-2">
            <button class="px-3 py-1 bg-blue-600 text-white rounded" onClick={() => (clicks.value += 1)}>+1</button>
            <button class="px-3 py-1 bg-blue-600 text-white rounded" onClick={() => (clicks.value += 100)}>+100</button>
            <button class="px-3 py-1 border rounded" onClick={() => (clicks.value = 0)}>Reset</button>
          </div>
          <div class="text-xs text-gray-500">Tick: {tick}</div>
        </div>

        <div class="space-y-3 p-4 border rounded">
          <h3 class="font-semibold">Expensive compute (isolated)</h3>
          <label class="block text-sm text-gray-700">Iterations</label>
          <input
            type="number"
            value={size}
            onInput={(e: any) => (size.value = Number(e.target.value) || 0)}
            class="w-full px-2 py-1 border rounded"
            min="10000"
            step="5000"
          />
          <div class="text-sm text-gray-700">Result: {result}</div>
          <div class="text-sm text-gray-700">Last duration: {durationMs} ms</div>
          <p class="text-xs text-gray-500">
            Changing iterations triggers the heavy compute. Clicking the counter does not.
          </p>
        </div>
      </div>

      <p class="text-gray-700 text-sm">
        This shows fine-grained updates: only the affected text nodes re-render. No need for
        memo hooks; computations are driven by the specific refs they depend on.
      </p>
    </div>
  ) as unknown as HTMLElement;
}