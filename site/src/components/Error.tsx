import { navigate } from "auwla/router";

export function Error(reasons: any) {
  console.log(reasons)
  return () => (
    <div class="py-16 text-center max-w-md mx-auto">
      <h2 class="text-3xl font-semibold text-slate-800">404</h2>
      <p class="text-slate-500 mt-2">Error : { String(reasons)}</p>
        <button
          onClick={() => navigate('/docs/:slug', { slug: 'introduction' })}
          class="mt-6 px-5 py-2.5 rounded-md bg-[#ff3e00] hover:bg-[#e03500] text-white text-sm font-medium transition"
        >
        Back to Introduction
        </button>
      </div>
    );
}
