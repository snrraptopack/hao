import { __componentBlock, __cloneTemplate, __createBlock, __dirtySource, __event, __keyedMap, __setAttribute, __setChild, __setClass, __setElementText, __setProperty, __setStyle, __setText, __spreadProps, __trackSources } from 'auwla';
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
  return __componentBlock(() => {
        __trackSources(['props.style', 'props.children']);
        const el0 = document.createElement("a");
        ((el) => {
          // Attach mouseenter directly to the DOM node to bypass Auwla's automatic
          // render cycle wrapper. This prevents the Link from unnecessarily re-rendering
          // on hover, which would otherwise rip the DOM node out mid-click.
          el.addEventListener("mouseenter", () => {
            console.log("mouseenter")
            if (prefetch) prefetchRoute(href as string)
          }, { passive: true })
        })(el0);

        return __createBlock(() => ({
          node: el0,
          update() {
          const exact   = isExactActive(href)
          const partial = isActive(href)
          const classes = [
      props.class,
      partial && activeClass,
      exact   && exactActiveClass,
    ].filter(Boolean).join(" ") || undefined
          console.log("Link update", href, "classes", classes)
          __setAttribute(el0, "href", href);
          __setClass(el0, classes);
          __setStyle(el0, props.style);
          __setElementText(el0, props.children);
          },
        }));
      });
}
