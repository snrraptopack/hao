type IslandModuleEntry = {
  exports?: Record<string, any>;
  load?: () => Promise<Record<string, any>>;
};

import { hydrateTrackData } from './hydration';

let manifestPromise: Promise<void> | null = null;

async function loadIslandManifest(): Promise<void> {
  if (manifestPromise) return manifestPromise;
  manifestPromise = import('auwla:islands')
    .then(() => undefined)
    .catch(() => undefined);
  return manifestPromise;
}

function resolveFromModule(mod: Record<string, any> | undefined, name: string): any {
  if (!mod) return null;
  if (mod[name]) return mod[name];
  if (name === 'default' && mod.default) return mod.default;
  if (mod.default && typeof mod.default === 'function' && mod.default.name === name) {
    return mod.default;
  }
  for (const value of Object.values(mod)) {
    if (typeof value === 'function' && value.name === name) return value;
  }
  return null;
}

async function resolveRegisteredIslandComponent(name: string): Promise<any> {
  let registry = (globalThis as any).__auwla_islandModules;
  const isAlreadyRegistered = registry && (Array.isArray(registry) ? (registry as any)[name] : registry[name]);
  if (!isAlreadyRegistered) {
    await loadIslandManifest();
    registry = (globalThis as any).__auwla_islandModules;
  }
  if (!registry) return null;

  if (Array.isArray(registry)) {
    const keyedEntry = (registry as any)[name] as IslandModuleEntry | undefined;
    if (keyedEntry) {
      if (keyedEntry.exports) {
        const eager = resolveFromModule(keyedEntry.exports, name);
        if (eager) return eager;
      }
      if (keyedEntry.load) {
        const mod = await keyedEntry.load();
        keyedEntry.exports = mod;
        return resolveFromModule(mod, name);
      }
    }

    const entries = registry as IslandModuleEntry[];
    for (const entry of entries) {
      const eager = resolveFromModule(entry.exports, name);
      if (eager) return eager;
    }
    for (const entry of entries) {
      if (!entry.load) continue;
      const mod = await entry.load();
      entry.exports = mod;
      const loaded = resolveFromModule(mod, name);
      if (loaded) return loaded;
    }
  } else {
    const entry = registry[name] as IslandModuleEntry | undefined;
    if (!entry) return null;
    if (entry.exports) {
      const eager = resolveFromModule(entry.exports, name);
      if (eager) return eager;
    }
    if (entry.load) {
      const mod = await entry.load();
      entry.exports = mod;
      return resolveFromModule(mod, name);
    }
  }
  return null;
}

const hydrated = new WeakSet<HTMLElement>();

/**
 * The single active lazy-hydration observer and the elements it still watches.
 * Module-level so `createIslandsApp().destroy()` (and repeated `render()`
 * calls, which re-enter `hydrateIslands`) share one observer instead of
 * leaking a new `IntersectionObserver` per call.
 */
let activeObserver: IntersectionObserver | null = null;
const pendingIslands = new Set<HTMLElement>();

/** Disconnect the observer once nothing is left to lazily hydrate. */
function releaseObserverIfIdle(): void {
  if (activeObserver && pendingIslands.size === 0) {
    activeObserver.disconnect();
    activeObserver = null;
  }
}

export function hydrateIslands(getComponent: (name: string) => any | Promise<any> = resolveRegisteredIslandComponent): void {
  if (typeof window === 'undefined') return;
  const elements = document.querySelectorAll('[data-auwla-island]');
  if (elements.length === 0) return;

  async function triggerHydration(el: HTMLElement) {
    if (hydrated.has(el)) return;
    hydrated.add(el);
    try {
      const componentName = el.getAttribute('data-auwla-island');
      const rawProps = el.getAttribute('data-props');
      if (!componentName) return;

      let props = {};
      try {
        props = rawProps ? JSON.parse(rawProps) : {};
      } catch (error) {
        console.warn(`[Auwla] Failed to parse props for island "${componentName}".`, error);
      }

      const Component = await getComponent(componentName);
      if (!Component) {
        console.warn(`[Auwla] Island component "${componentName}" not found.`);
        return;
      }

      const { createMemoApp } = await import('auwla/runtime/app');

      // Islands are server-rendered as an empty shell (no inner HTML), so we
      // must NOT set `data-auwla-ssr` here. If we did, `createMemoApp` would
      // detect SSR content and enter hydration mode — then the hydration cursor
      // would fail to match comment markers that don't exist, causing it to
      // append fresh DOM next to whatever content was in the shell, producing
      // a double render. Clearing innerHTML first guarantees a clean fresh mount.
      el.innerHTML = '';
      // Seed the SSR track payload BEFORE the component setup runs — setups
      // that read routed data (getRouted/getLoaderHandle) need the hydrated
      // registry in place, and `Component(props)` evaluates setup synchronously
      // before createMemoApp would hydrate it (ordering bug).
      hydrateTrackData();
      createMemoApp(el, Component(props));
    } finally {
      pendingIslands.delete(el);
      releaseObserverIfIdle();
    }
  }

  const useObserver = typeof IntersectionObserver !== 'undefined';
  if (!useObserver) {
    for (const el of Array.from(elements)) {
      void triggerHydration(el as HTMLElement);
    }
    return;
  }

  if (!activeObserver) {
    activeObserver = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          const el = entry.target as HTMLElement;
          activeObserver!.unobserve(el);
          void triggerHydration(el);
        }
      }
    }, { rootMargin: '200px' });
  }

  for (const el of Array.from(elements)) {
    const rect = el.getBoundingClientRect();
    const isAboveFold = rect.top < window.innerHeight;

    if (isAboveFold) {
      void triggerHydration(el as HTMLElement);
    } else if (!hydrated.has(el as HTMLElement)) {
      pendingIslands.add(el as HTMLElement);
      activeObserver.observe(el as HTMLElement);
    }
  }
}

export function createIslandsApp(root: Element): { root: Element; render(): void; destroy(): void } {
  hydrateIslands();
  return {
    root,
    render() {
      hydrateIslands();
    },
    destroy() {
      if (activeObserver) {
        activeObserver.disconnect();
        activeObserver = null;
      }
      pendingIslands.clear();
    },
  };
}
