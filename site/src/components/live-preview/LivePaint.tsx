export default function LivePaint() {
  let color = '#3B82F6';
  let width = 4;
  const colors = ['#F59E0B', '#10B981', '#3B82F6', '#8B5CF6'];
  let canvasEl: HTMLCanvasElement | null = null;
  let isDrawing = false;
  let observer: ResizeObserver | null = null;

  function cleanupObserver() {
    if (observer) {
      observer.disconnect();
      observer = null;
    }
  }

  function getDrawCoords(e: PointerEvent): { x: number, y: number } {
    if (!canvasEl) return { x: 0, y: 0 };
    const rect = canvasEl.getBoundingClientRect();
    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    const x = (e.clientX - rect.left) * dpr;
    const y = (e.clientY - rect.top) * dpr;
    return { x, y };
  }

  function start(e: PointerEvent) {
    isDrawing = true;
    if (!canvasEl) return;
    const ctx = canvasEl.getContext('2d')!;
    const { x, y } = getDrawCoords(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  }

  function draw(e: PointerEvent) {
    if (!isDrawing || !canvasEl) return;
    const ctx = canvasEl.getContext('2d')!;
    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    const { x, y } = getDrawCoords(e);
    ctx.lineTo(x, y);
    ctx.strokeStyle = color;
    ctx.lineWidth = width * dpr;
    ctx.stroke();
  }

  function stop() {
    isDrawing = false;
  }

  function clear() {
    if (!canvasEl) return;
    const ctx = canvasEl.getContext('2d')!;
    ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
  }

  return () => (
    <div class="relative w-full h-full flex flex-col bg-[#fffbf0] rounded-xl border border-slate-200 shadow-md overflow-hidden select-none">
      {/* Top Header */}
      <div class="h-10 bg-slate-100/90 border-b border-slate-200/60 flex items-center justify-center text-[11px] font-semibold text-slate-500 font-sans tracking-wider uppercase select-none shrink-0">
        Paint Demo
      </div>

      {/* Floating Clear Button */}
      <button
        onClick={clear}
        class="absolute right-3 top-13 z-20 px-2 py-1 text-[10px] font-medium border border-slate-200 bg-white/90 hover:bg-white text-slate-600 rounded-md shadow-sm backdrop-blur-sm transition select-none active:scale-95 cursor-pointer"
      >
        Clear
      </button>

      {/* Draw Hint */}
      <div class="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0">
        <span class="text-slate-400/20 font-serif italic text-xl tracking-wide">draw here</span>
      </div>

      {/* Canvas */}
      <canvas
        ref={(el) => {
          if (el) {
            if (el !== canvasEl) {
              cleanupObserver();
              canvasEl = el;
              if (typeof window !== 'undefined' && 'ResizeObserver' in window) {
                observer = new ResizeObserver((entries) => {
                  const dpr = window.devicePixelRatio || 1;
                  for (let entry of entries) {
                    const { width: rw, height: rh } = entry.contentRect;
                    if (rw > 0 && rh > 0) {
                      el.width = rw * dpr;
                      el.height = rh * dpr;
                    }
                  }
                });
                observer.observe(el);
              }
            }
          } else {
            cleanupObserver();
            canvasEl = null;
          }
        }}
        onPointerDown={start}
        onPointerMove={draw}
        onPointerUp={stop}
        onPointerLeave={stop}
        class="flex-grow w-full min-h-0 bg-[#fffbe8] cursor-crosshair touch-none z-10"
        style="display:block;"
      />

      {/* Controls */}
      <div class="h-12 border-t border-[#ebdcb9] flex justify-between items-center bg-[#fffbf0] px-5 shrink-0 z-10 select-none">
        <div class="flex items-end gap-2 h-7 pb-1">
          {[2, 4, 8, 12].map(w => (
            <button
              onClick={() => width = w}
              class="flex items-center justify-center p-0 border-none outline-none bg-transparent cursor-pointer group"
            >
              <div
                class={`w-1.5 rounded-full transition-all duration-200 ${width === w ? 'bg-slate-800 h-6' : 'bg-slate-300 h-3 group-hover:bg-slate-400'
                  }`}
              />
            </button>
          ))}
        </div>

        <div class="flex items-end gap-1.5 h-8">
          {colors.map(c => (
            <button
              onClick={() => color = c}
              class="p-0 border-none outline-none bg-transparent cursor-pointer"
            >
              <div
                class="w-4 rounded-t-full transition-all duration-300"
                style={{
                  backgroundColor: c,
                  height: color === c ? '32px' : '18px',
                  opacity: color === c ? '1' : '0.6'
                }}
              />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
