# Introduction
Auwla is a lightweight, reactive UI framework designed for fast,
predictable updates with a simple mental model. It emphasizes fine‑grained reactivity, real DOM rendering,
and practical developer ergonomics over heavy abstractions.

<chapter title="what"  id="What-Auwla-is">
    <title instance="a">What Auwla?</title>
    <list>
        <li>A reactive UI framework centered around signals and watchers. You manage state with refs and stores, and the framework updates the DOM directly where necessary—no virtual DOM layer.</li>
        <li>A JSX-driven system where components produce real DOM elements (HTMLElement/Node), not React elements. This keeps rendering straightforward and makes performance characteristics easier to reason about.</li>
        <li>A batteries‑included toolkit: routing, data fetching/caching, lifecycle hooks, context, JSX utilities for lists and conditionals, and devtools.</li>
    </list>
</chapter>

<chapter title="Core ideas" id="core-ideas">
    <list> 
        <li>Fine‑grained reactivity:
            <list type="alpha-lower">
                <li>Ref signals hold values and notify subscribers (watchers) when they change.</li>
                <li>watch/watchEffect and derive give you precise control over when and how updates propagate.</li>
                <li>batch, flush, and flushSync let you tune scheduling (coalescing updates vs. immediate DOM sync).</li>
            </list>
        </li>
        <li>Real DOM rendering:
            <list type="alpha-lower">
                <li>JSX compiles to Auwla’s h factory and returns real DOM nodes.</li>
                <li>Attributes and events are applied natively (onClick → click, etc.), with typed handlers.</li>
                <li>class and className are both supported; styles accept strings or partial style objects.</li>
            </list>
        </li>
        <li>Simple component/lifecycle model:
            <list type="alpha-lower">
                <li>Components are just functions that return DOM elements.</li>
                <li>onMount and onUnmount provide lifecycle hooks for subscriptions, effects, and cleanup.</li>
                <li>Automatic watcher cleanup helps prevent leaks when components unmount.</li>
            </list>
        </li>
        <li>State and store:
            <list type="alpha-lower">
                <li>ref for single values; createStore for structured, nested state with structural sharing.</li>
                <li>Designed to work naturally with immutable update patterns and efficient list reconciliation.</li>
            </list>
        </li>
        <li>JSX utilities for UI composition:
            <list type="alpha-lower">
                <li>For renders lists with keyed reconciliation, smart change detection, and a LIS algorithm for efficient reorders. It reuses DOM nodes when items’ references don’t change.</li>
                <li>When enables declarative conditional rendering with clear truthy branches and a fallback. Watches are automatically managed.</li>
            </list>
        </li>
        <li>Data fetching and caching:
            <list type="alpha-lower">
                <li>createResource wraps async fetching with a consistent API for loading/error/data.</li>
                <li>Supports cache keys, aborting in‑flight requests, staleTime, stale‑while‑revalidate, and revalidateOnFocus.</li>
                <li>Route‑scoped resources can bootstrap instantly from router state (e.g., via route prefetch).</li>
            </list>
        </li>
    </list>
</chapter>


<chapter title="Why you should choose Auwla" id="Why-developers-choose-Auwla">
    <list>
        <li>Performance: minimal, targeted DOM updates without a virtual DOM diff step. The list renderer is engineered for reorders and large updates.</li>
        <li>Predictability: explicit signals and watchers make data flow transparent; scheduling APIs expose when updates hit the DOM.</li>
        <li>Ergonomics: familiar JSX, flexible attribute typing, straightforward events, and intuitive lifecycle hooks.</li>
        <li>Type safety: clear type definitions for JSX elements, events, routing, and data resources keep your codebase consistent.</li>
        <li>Small and focused: few external dependencies, integrates cleanly with Vite and TypeScript, and keeps overhead low.</li>
    </list>
</chapter>