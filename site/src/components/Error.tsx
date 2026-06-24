import { navigate, getRouteError } from "auwla/router";

export function Error() {
  const err = getRouteError()
  const message = err?.message ?? String(err?.reason ?? "Unknown error")
  const status = err?.context?.path ? 404 : 500

  return () => (
    <div class="py-16 text-center max-w-md mx-auto">
      <h2 class="text-3xl font-semibold text-slate-800">{status === 404 ? "404" : "Error"}</h2>
      <p class="text-slate-500 mt-2">{message}</p>
      {err?.context?.path && (
        <p class="text-xs text-slate-400 mt-1 font-mono">{err.context.path}</p>
      )}
      <button
        onClick={() => navigate('/docs/:slug', { slug: 'introduction' })}
        class="mt-6 px-5 py-2.5 rounded-md bg-[#ff3e00] hover:bg-[#e03500] text-white text-sm font-medium transition"
      >
        Back to Introduction
      </button>
    </div>
  );
}
