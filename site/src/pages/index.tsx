import { commit, component } from 'auwla'
import { Link } from 'auwla/router'
import Prism from 'prismjs'
// Load TSX and JSX language extensions into Prism
import 'prismjs/components/prism-jsx'
import 'prismjs/components/prism-tsx'
import 'prismjs/components/prism-typescript'

// ─── Interactive Showcase Tabs Wrapper ──────────────────────────────────────
function Showcase(props: {
  title: string;
  tabs: { name: string; code: string }[];
  renderPreview: () => JSX.Element;
}) {
  let activeTab = props.tabs[0]!;
  let codeEl: HTMLElement | null = null;

  function updateCode(tab: typeof activeTab) {
    activeTab = tab;
    if (codeEl) {
      codeEl.innerHTML = Prism.highlight(tab.code, Prism.languages.tsx!, 'tsx');
    }
  }

  return () => (
    <div class="flex flex-col lg:flex-row bg-[#151821] border border-[#262936] rounded-xl overflow-hidden shadow-sm lg:h-[420px] min-h-[420px]">
      {/* Code Panel (Left, takes remaining space) */}
      <div class="flex-grow flex flex-col min-w-0 border-r border-[#262936]">
        {/* Tabs Bar */}
        <div class="flex items-center justify-between border-b border-[#262936] bg-[#1a1c25] px-4 py-1.5 shrink-0 select-none">
          {props.tabs.length > 1 ? (
            <div class="flex gap-1.5">
              {props.tabs.map((tab) => (
                <button
                  onClick={() => { updateCode(tab); }}
                  class={`px-3 py-1 text-xs font-mono font-semibold rounded transition border ${activeTab.name === tab.name
                    ? 'bg-[#262936] text-white border-[#3b3e52]'
                    : 'text-[#8b949e] hover:text-[#c9d1d9] border-transparent'
                    }`}
                >
                  {tab.name}
                </button>
              ))}
            </div>
          ) : (
            <span class="text-xs font-mono font-semibold text-slate-450 px-3 py-1">
              {props.tabs[0]?.name}
            </span>
          )}
        </div>

        {/* Scrollable Highlighted Code — scrollbar hidden */}
        <div class="flex-grow min-h-0 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <pre class="font-mono text-sm text-[#e6edf3] overflow-x-auto leading-relaxed bg-[#151821] p-6 w-full h-full m-0 border-0 rounded-none">
            <code
              key={activeTab.name}
              ref={(el) => {
                codeEl = el;
                el.innerHTML = Prism.highlight(activeTab.code, Prism.languages.tsx!, 'tsx');
              }}
            />
          </pre>
        </div>
      </div>

      {/* Preview Panel (Right, fixed width) */}
      <div class="w-full lg:w-[280px] bg-white flex flex-col shrink-0 border-l border-[#262936]">
        <div class="h-10 bg-[#1a1c25] border-b border-[#262936] px-6 flex items-center justify-between text-[11px] font-semibold text-[#8b949e] uppercase tracking-wider font-sans select-none shrink-0">
          <div class="flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Preview</span>
          </div>
        </div>
        {/* No padding — let the rendered preview fill the panel */}
        <div class="flex-grow flex items-stretch overflow-hidden">
          {props.renderPreview()}
        </div>
      </div>
    </div>
  );
}

// ─── Live Inline Counter Component ──────────────────────────────────────────
function LiveCounter() {
  let count = 0;
  return () => (
    <div class="w-full h-full flex items-center justify-center bg-white">
      <button
        onClick={() => count++}
        class="px-5 py-2.5 rounded-md bg-[#ff3e00] hover:bg-[#e03500] text-white font-medium shadow-sm transition active:scale-98 select-none font-sans"
      >
        Clicks: {count}
      </button>
    </div>
  );
}

// ─── Live Inline Paint Component ─────────────────────────────────────────────
function LivePaint() {
  let isDrawing = false;
  let canvasRef: HTMLCanvasElement | null = null;
  let ctx: CanvasRenderingContext2D | null = null;

  let strokeColor = '#3B82F6';
  let strokeWidth = 4;

  const colors = ['#F59E0B', '#10B981', '#3B82F6', '#8B5CF6'];
  const widths = [2, 4, 8, 12];

  function start(e: PointerEvent) {
    isDrawing = true;
    if (!ctx) return;
    ctx.beginPath();
    ctx.moveTo(e.offsetX, e.offsetY);
  }

  function draw(e: PointerEvent) {
    if (!isDrawing || !ctx) return;
    ctx.lineTo(e.offsetX, e.offsetY);
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = strokeWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
  }

  function stop() {
    isDrawing = false;
  }

  function clear() {
    if (ctx && canvasRef) {
      ctx.clearRect(0, 0, canvasRef.width, canvasRef.height);
    }
  }

  return () => (
    <div class="relative w-full h-full flex flex-col bg-[#fffbe8]">
      {/* Watermark text */}
      <div class="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
        <span class="text-slate-450/20 font-serif italic text-2xl tracking-wide">draw here</span>
      </div>
      <canvas
        ref={(el) => {
          canvasRef = el as HTMLCanvasElement;
          if (canvasRef && !ctx) {
            canvasRef.width = 280;
            canvasRef.height = 380;
            ctx = canvasRef.getContext('2d');
          }
        }}
        onPointerDown={start}
        onPointerMove={draw}
        onPointerUp={stop}
        onPointerLeave={stop}
        class="flex-grow w-full min-h-0 bg-transparent cursor-crosshair touch-none z-10"
        style="display:block;"
      />
      <div class="px-3 py-2 border-t border-[#ebdcb9] flex justify-between items-center bg-[#fffbe8] shrink-0 z-10 select-none">
        {/* Colors */}
        <div class="flex items-center gap-1.5">
          {colors.map((c) => (
            <button
              onClick={() => { strokeColor = c; }}
              class={`w-4 h-4 rounded-full border transition active:scale-90 cursor-pointer ${
                strokeColor === c ? 'border-slate-800 scale-110 shadow-sm' : 'border-transparent hover:scale-105'
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>

        {/* Widths */}
        <div class="flex items-center gap-1 h-6">
          {widths.map((w) => (
            <button
              onClick={() => { strokeWidth = w; }}
              class="w-6 h-6 flex items-center justify-center cursor-pointer p-0 border-none outline-none bg-transparent hover:bg-slate-200/40 rounded transition"
            >
              <div
                class={`rounded-full transition ${
                  strokeWidth === w ? 'bg-slate-800' : 'bg-slate-400'
                }`}
                style={{ width: `${w}px`, height: `${w}px` }}
              />
            </button>
          ))}
        </div>

        <button
          onClick={clear}
          class="px-2.5 py-1 rounded border border-[#e3d1a8] bg-white hover:bg-[#fffdf5] text-slate-700 text-xs font-medium transition active:scale-98 cursor-pointer"
        >
          Clear
        </button>
      </div>
    </div>
  );
}

// ─── Homepage Layout ──────────────────────────────────────────────────────────
export default function Home() {
  let copied = false;
  const self = component();

  const grid = [
    { title: "Direct compilation", desc: "Transforms TSX into optimized DOM patches, skipping Virtual DOM trees entirely." },
    { title: "No hooks or signals", desc: "No complex state wrappers. State is held in plain variables inside component closures." },
    { title: "Native DOM speed", desc: "Updates only what changed using direct templates and memoized element reuse." },
    { title: "Isomorphic by design", desc: "Built-in server rendering and type-safe RPC client hydration in one workspace." }
    ]

  function copyInstall() {
    navigator.clipboard.writeText('npm install auwla');
    copied = true;
    setTimeout(() => {
      copied = false;
      commit(self);
    }, 2000);
  }

  const counterCode = `export default function Counter() {
  let count = 0;

  return () => (
    <button onClick={() => count++}>
      Clicks: {count}
    </button>
  );
}`;

  const paintCode = `import { start, draw } from './painter';

export default function Paint() {
  let color = '#3B82F6';
  let width = 4;
  const colors = ['#F59E0B', '#10B981', '#3B82F6', '#8B5CF6'];

  return () => (
    <div class="flex flex-col h-full bg-[#fffbe8]">
      <canvas
        width="280"
        height="380"
        onPointerDown={start}
        onPointerMove={(e) => draw(e, color, width)}
      />
      <div class="toolbar flex justify-between px-3 py-2 border-t">
        {/* Color picker */}
        <div class="colors flex gap-1">
          {colors.map(c => (
            <button onClick={() => color = c} style={{ backgroundColor: c }} />
          ))}
        </div>
        {/* Stroke width picker */}
        <div class="widths flex gap-1 items-center">
          {[2, 4, 8, 12].map(w => (
            <button onClick={() => width = w} style={{ width: \`\${w}px\`, height: \`\${w}px\` }} />
          ))}
        </div>
      </div>
    </div>
  );
}`;

  const paintHelperCode = `let isDrawing = false;

export function start(e: PointerEvent) {
  isDrawing = true;
  const canvas = e.currentTarget as HTMLCanvasElement;
  const ctx = canvas.getContext('2d')!;
  ctx.beginPath();
  ctx.moveTo(e.offsetX, e.offsetY);
}

export function draw(e: PointerEvent, color: string, width: number) {
  if (!isDrawing) return;
  const canvas = e.currentTarget as HTMLCanvasElement;
  const ctx = canvas.getContext('2d')!;
  ctx.lineTo(e.offsetX, e.offsetY);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.stroke();
}`;

  return () => (
    <div class="text-slate-800 font-sans antialiased">

      {/* Hero Section (Vercel-style heavy Inter) */}
      <section class="mx-auto max-w-[1200px] px-6 pt-16 pb-20 md:pt-24 md:pb-28">
        <div class="text-center space-y-6">
          <h1 class="text-5xl md:text-7xl font-extrabold tracking-[-0.04em] text-black leading-[0.95] max-w-4xl mx-auto">
            The web framework that doesn&apos;t get in the way.
          </h1>

          <p class="text-lg md:text-xl text-slate-500 font-normal leading-relaxed max-w-2xl mx-auto font-sans pt-2">
            Auwla compiles JSX closures into direct, memoized DOM updates. Code with plain JavaScript variables—no reactive state wrappers needed.
          </p>

          <div class="flex flex-wrap items-center justify-center gap-4 pt-6">
            <Link
              href="/docs/:slug"
              params={{ slug: 'introduction' }}
              class="px-6 py-3 rounded-md bg-[#ff3e00] text-white font-medium hover:bg-[#e03500] transition text-center shadow-sm font-sans"
            >
              Get started
            </Link>
            <Link
              href="/playground"
              class="px-6 py-3 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 font-medium transition text-center font-sans"
            >
              Playground
            </Link>
            <button
              onClick={copyInstall}
              class="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 hover:bg-slate-100 font-mono text-sm text-slate-500 px-4 py-3 transition group select-none"
            >
              <span class="text-[#ff3e00] font-bold">$</span>
              <span>npm install auwla</span>
              <span class="ml-4 text-xs font-bold text-slate-400 group-hover:text-slate-600">
                {copied ? 'Copied!' : 'Copy'}
              </span>
            </button>
          </div>
        </div>

        {/* Key Features Grid */}
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mt-20 border-t border-slate-100 pt-16">
          {grid.map((val) => (
            <div key={val.title} class="space-y-2">
              <h4 class="font-semibold text-slate-900 text-base font-sans flex items-center gap-2">
                <span class="text-[#ff3e00] font-bold">✓</span> {val.title}
              </h4>
              <p class="text-sm text-slate-500 leading-relaxed font-sans">{val.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Demos Section */}
      <section class="bg-[#fafafa] border-t border-slate-100 py-24">
        <div class="mx-auto max-w-[1200px] px-6 space-y-24">

          <div class="text-center max-w-2xl mx-auto space-y-4">
            <h2 class="text-4xl md:text-5xl font-extrabold tracking-[-0.03em] text-black">
              See it in action.
            </h2>
            <p class="text-slate-500 text-base leading-relaxed font-sans">
              Explore how Auwla binds state variables and runs operations. Tap, interact, and draw in real-time.
            </p>
          </div>

          {/* Showcase 1: Counter */}
          <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            <div class="lg:col-span-4 space-y-4 flex flex-col justify-center">
              <h3 class="text-2xl font-bold tracking-tight text-black leading-tight">
                Reactivity through closures
              </h3>
              <p class="text-slate-500 leading-relaxed font-sans">
                Variables declared in the component setup scope serve as reactive state. Triggering an event automatically schedules a single re-render, patching the exact DOM text node.
              </p>
            </div>

            <div class="lg:col-span-8">
              <Showcase
                title="Counter"
                tabs={[
                  { name: 'Counter.tsx', code: counterCode }
                ]}
                renderPreview={() => <LiveCounter />}
              />
            </div>
          </div>

          {/* Showcase 2: Paint */}
          <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch pt-8">
            <div class="lg:col-span-4 space-y-4 flex flex-col justify-center">
              <h3 class="text-2xl font-bold tracking-tight text-black leading-tight">
                High-performance events
              </h3>
              <p class="text-slate-500 leading-relaxed font-sans">
                Auwla easily handles high-frequency pointer and touch events. Elements can be captured using ref callbacks, bypassing custom wrappers.
              </p>
            </div>

            <div class="lg:col-span-8">
              <Showcase
                title="Paint"
                tabs={[
                  { name: 'Paint.tsx', code: paintCode },
                  { name: 'painter.ts', code: paintHelperCode }
                ]}
                renderPreview={() => <LivePaint />}
              />
            </div>
          </div>

        </div>
      </section>

      {/* Footer */}
      <footer class="border-t border-slate-200 bg-white py-12">
        <div class="mx-auto max-w-[1200px] px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p class="text-xs text-slate-400">
            &copy; 2026 Auwla. Under MIT License.
          </p>
          <div class="flex gap-6 text-xs font-semibold text-slate-400 font-sans">
            <Link href="/docs/:slug" params={{ slug: 'introduction' }} class="hover:text-[#ff3e00] transition">Documentation</Link>
            <Link href="/playground" class="hover:text-[#ff3e00] transition">Playground</Link>
          </div>
        </div>
      </footer>

    </div>
  )
}
