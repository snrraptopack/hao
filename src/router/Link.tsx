// Link.tsx
import type { MemoChild } from "auwla"
import { isActive, isExactActive } from "./Router"
import { prefetchRoute } from "./prefetch"
import { pathFor } from "./routes"
import type { ValidRoutePath, PathParams } from "./types"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type LinkProps<P extends ValidRoutePath = ValidRoutePath> = {
  /**
   * The target route path.
   *
   * When the `Register` interface has been augmented, TypeScript validates
   * this value against the registered route path literals at compile time.
   * Without augmentation it accepts any string (backward-compatible).
   */
  href: P
  // If the route has dynamic segments (e.g. /users/:id), pass them here.
  params?: string extends P ? Record<string, string> : PathParams<P>
  // Optional query string parameters.
  query?: Record<string, string | number | boolean>
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

export function Link<P extends ValidRoutePath>(props: LinkProps<P>) {
  const {
    href,
    activeClass = "active",
    exactActiveClass = "exact-active",
    prefetch = true,
  } = props
  // Active class computation must happen inside the render closure so it
  // re-evaluates on every navigation commit, not just on component setup.
  return () => {
    // Generate the real URL by interpolating params and query.
    const actualUrl = pathFor(href as string, props.params as any, props.query)

    // Active class computation must happen inside the render closure so it
    // re-evaluates on every navigation commit, not just on component setup.
    const exact = isExactActive(actualUrl)
    const partial = isActive(actualUrl)

    // Build the final class string by combining the static class with any
    // active classes that currently apply. Filter out falsy entries so the
    // attribute is omitted entirely when no classes are present.
    const classes = [
      props.class,
      partial && activeClass,
      exact && exactActiveClass,
    ].filter(Boolean).join(" ") || undefined

    return (
      <a
        href={actualUrl}
        class={classes}
        style={props.style}
        ref={(el) => {
          // Attach mouseenter directly to the DOM node to bypass Auwla's automatic
          // render cycle wrapper. This prevents the Link from unnecessarily re-rendering
          // on hover, which would otherwise rip the DOM node out mid-click.
          el.addEventListener("mouseenter", () => {
            // Compute the URL lazily inside the event listener so the compiler does
            // not need to hoist `actualUrl` into the setup closure.
            if (prefetch) {
              prefetchRoute(pathFor(href as string, props.params as any, props.query))
            }
          }, { passive: true })
        }}
      >
        {props.children}
      </a>
    )
  }
}
