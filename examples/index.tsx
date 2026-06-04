import {} from "auwla/jsx-runtime"
import { createMemoApp } from "auwla"
import {
  Router,
  Link,
  defineRoutes,
  group,
  composeRoutes,
  resetRoutes,
  resetHooks,
} from "auwla/router"
import './index.css'

// Simple examples
import { ExampleApp } from "./main"
import { EmitExample } from "./emit"
import { EventChainExampleApp } from "./event-chain"
import { FetchExample } from "./fetch"
import { JsxPatternsExample } from "./jsxptterns"
import { PatternsExample } from "./patterns"
import { TrackExample } from "./track"
import { PerfExample } from "./perf"
import { TableBenchmarkExample } from "./table-benchmark"
import { TableBenchmarkRuntimeExample } from "./table-benchmark-runtime"

// Router examples — routes + shells
import { navigationRoutes, NavigationShell } from "./navigation"
import { childRoutes, ChildShell } from "./child"
import { loaderRoutes, LoaderShell } from "./loader"

// ---------------------------------------------------------------------------
// Central route definitions — compose everything and register once
// ---------------------------------------------------------------------------

resetRoutes()
resetHooks()

defineRoutes(
  composeRoutes(
    // Simple examples — no group, no layout
    [
      { path: "/", component: ExampleApp },
      { path: "/emit", component: EmitExample },
      { path: "/event-chain", component: EventChainExampleApp },
      { path: "/fetch", component: FetchExample },
      { path: "/jsx-patterns", component: JsxPatternsExample },
      { path: "/patterns", component: PatternsExample },
      { path: "/track", component: TrackExample },
      { path: "/perf", component: PerfExample },
      { path: "/table-benchmark", component: TableBenchmarkExample },
      { path: "/table-benchmark-runtime", component: TableBenchmarkRuntimeExample },
    ],

    // Router examples — grouped under a base path with shared layout shell
    group("/navigation", { layout: NavigationShell }, navigationRoutes),
    group("/child", { layout: ChildShell }, childRoutes),
    group("/loader", { layout: LoaderShell }, loaderRoutes),

    // Catch-all
    [
      { path: "*", component: () => () => <div style={{ padding: '40px', textAlign: 'center' }}><h1>404 — Example not found</h1></div> },
    ]
  )
)

// ---------------------------------------------------------------------------
// Gallery layout
// ---------------------------------------------------------------------------

const examples = [
  { path: "/", label: "Main" },
  { path: "/emit", label: "Emit" },
  { path: "/event-chain", label: "Event Chain" },
  { path: "/fetch", label: "Fetch" },
  { path: "/jsx-patterns", label: "JSX Patterns" },
  { path: "/patterns", label: "Patterns" },
  { path: "/track", label: "Track" },
  { path: "/perf", label: "Performance" },
  { path: "/table-benchmark", label: "Table Benchmark" },
  { path: "/table-benchmark-runtime", label: "Table Benchmark (Runtime)" },
  { path: "/navigation", label: "Navigation" },
  { path: "/child", label: "Child / Router" },
  { path: "/loader", label: "Router Loader" },
]

function Gallery() {
  return () => (
    <div class="gallery">
      <aside class="gallery-sidebar">
        <h1>Auwla Examples</h1>
        <nav>
          {examples.map((ex) => (
            <Link
              href={ex.path}
              activeClass="active"
              exactActiveClass="active"
            >
              {ex.label}
            </Link>
          ))}
        </nav>
      </aside>
      <div class="gallery-content">
        <Router />
      </div>
    </div>
  )
}

const root = document.getElementById("app")
if (root) {
  createMemoApp(root, <Gallery />)
}
