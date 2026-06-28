import { component } from 'auwla';

export default function LiveCounter() {
  let count = 0;

  return () => (
    <div class="w-full h-full flex items-center justify-center bg-white p-6">
      <button
        onClick={() => count++}
        class="px-5 py-2.5 rounded-md bg-[#ff3e00] hover:bg-[#e03500] text-white font-medium shadow-sm transition active:scale-98 select-none font-sans"
      >
        Clicks: {count}
      </button>
    </div>
  );
}
