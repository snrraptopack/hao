// Link.tsx
import {} from "auwla/jsx-runtime"
import type { MemoChild } from "auwla"
import { navigate } from "./navigation"
import { isActive, isExactActive } from "./Router"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type LinkProps = {
  href: string
  // Additional CSS classes always applied to the anchor.
  class?: string
  // Class applied when the current path matches href at a segment boundary.
  // Defaults to "active" when not provided.
  activeClass?: string
  // Class applied only when the current path is an exact match for href.
  // Defaults to "exact-active" when not provided.
  exactActiveClass?: string
  children?: MemoChild | MemoChild[]
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function Link(props: LinkProps) {
  const {
    href,
    activeClass     = "active",
    exactActiveClass = "exact-active",
  } = props

  return () => {
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

    return (
      <a
        href={href}
        class={classes}
        onClick={(e: MouseEvent) => {
          // Pass through modified clicks (new tab, etc.) and any link that
          // points outside the app — let the browser handle those normally.
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
