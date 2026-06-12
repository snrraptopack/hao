// Link.tsx
import {} from "auwla/jsx-runtime"
import type { MemoChild } from "auwla"
import { navigate } from "./navigation"
import { isActive, isExactActive } from "./Router"
import { prefetchRoute } from "./prefetch"
import type { ValidRoutePath } from "./types"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type LinkProps = {
  /**
   * The target route path.
   *
   * When the `Register` interface has been augmented, TypeScript validates
   * this value against the registered route path literals at compile time.
   * Without augmentation it accepts any string (backward-compatible).
   */
  href: ValidRoutePath
  // Additional CSS classes always applied to the anchor.
  class?: string
  // Additional CSS inline styles always applied to the anchor.
  style?: string | Record<string, string>
  // Class applied when the current path matches href at a segment boundary.
  // Defaults to "active" when not provided.
  activeClass?: string
  // Class applied only when the current path is an exact match for href.
  // Defaults to "exact-active" when not provided.
  exactActiveClass?: string
  /**
   * When true (the default), hovering the link calls prefetchRoute(href),
   * which starts the page chunk download and the route's data fetch before
   * the user clicks. This makes navigation feel instant on fast connections.
   *
   * Set to false to opt out, e.g. for links that are hovered frequently
   * but rarely clicked (navigation menus with many items).
   *
   * @default true
   */
  prefetch?: boolean
  children?: MemoChild | MemoChild[]
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function Link(props: LinkProps) {
  const {
    href,
    activeClass      = "active",
    exactActiveClass = "exact-active",
    prefetch         = true,
  } = props
  // Active class computation must happen inside the render closure so it
  // re-evaluates on every navigation commit, not just on component setup.
  const exact   = isExactActive(href)
  const partial = isActive(href)

  // Build the final class string by combining the static class with any
  // active classes that currently apply. Filter out falsy entries so the
  // attribute is omitted entirely when no classes are present.
  const classes = [
    props.class,
    partial && activeClass,
    exact   && exactActiveClass,
  ].filter(Boolean).join(" ") || undefined

  return () => {
    return (
      <a
        href={href}
        class={classes}
        style={props.style}
        onMouseEnter={() => {
          // Pre-warm the page chunk and routed data so navigation feels instant.
          // prefetchRoute() is a no-op when no prefetch map has been registered
          // (i.e. when lazy: false or registerPrefetches() was not called).
          if (prefetch) prefetchRoute(href as string)
        }}
        onClick={(e: MouseEvent) => {
          // Pass through modified clicks (new tab, etc.) and any link that
          // points outside the app — let the browser handle those normally.
          console.log("clicked",href)
          if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
          e.preventDefault()
          navigate(href)
        }}
      >
        {props.children}
      </a>
    )
  }
}
