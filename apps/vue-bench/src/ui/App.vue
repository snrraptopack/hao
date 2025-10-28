<template>
  <div class="toolbar">
    <button @click="updateAll">Update All</button>
    <button @click="shuffle">Shuffle</button>
    <input placeholder="Filter" :value="filter" @input="onType" />
    <span class="small">tick: {{ tick }}</span>
    <span class="small">items: {{ items.length }}</span>
    <span class="small">filtered: {{ filtered.length }}</span>
  </div>
  <div class="grid">
    <div v-for="n in filtered" :key="n" class="card">Row {{ n }}</div>
  </div>
  
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';

function measure(name: string) {
  try {
    performance.mark(name + ':end');
    performance.measure(name, name + ':start', name + ':end');
    const m = performance.getEntriesByName(name).pop();
    if (m) console.log(`[vue] ${name}: ${m.duration.toFixed(2)}ms`);
    performance.clearMarks(name + ':start');
    performance.clearMarks(name + ':end');
    performance.clearMeasures(name);
  } catch {}
}

const items = ref<number[]>(Array.from({ length: 800 }, (_, i) => i));
const filter = ref('');
const tick = ref(0);

const filtered = computed(() => {
  const q = filter.value.toLowerCase();
  return q ? items.value.filter((n) => String(n).includes(q)) : items.value;
});

onMounted(() => {
  queueMicrotask(() => measure('mount'));
});

const updateAll = () => {
  performance.mark('update-all:start');
  items.value = items.value.map((n) => n + 1);
  tick.value++;
  queueMicrotask(() => measure('update-all'));
};

const shuffle = () => {
  performance.mark('shuffle:start');
  const arr = items.value.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  items.value = arr;
  tick.value++;
  queueMicrotask(() => measure('shuffle'));
};

const onType = (e: Event) => {
  performance.mark('type:start');
  filter.value = (e.target as HTMLInputElement).value;
  queueMicrotask(() => measure('type'));
};
</script>