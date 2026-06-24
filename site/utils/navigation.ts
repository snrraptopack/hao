export interface NavLink {
  label: string;
  href: '/docs/:slug';
  slug: string;
}

export interface NavCategory {
  title: string;
  links: NavLink[];
}

export const docCategories: NavCategory[] = [
  {
    title: "Getting Started",
    links: [
      { label: "Introduction", href: "/docs/:slug", slug: "introduction" },
      { label: "Installation", href: "/docs/:slug", slug: "installation" },
      { label: "Quick Start", href: "/docs/:slug", slug: "quick-start" }
    ]
  },
  {
    title: "Core Reactivity",
    links: [
      { label: "Setup vs Render", href: "/docs/:slug", slug: "setup-render" },
      { label: "Closure State", href: "/docs/:slug", slug: "closure-state" },
      { label: "Manual Commit", href: "/docs/:slug", slug: "manual-commit" }
    ]
  },
  {
    title: "Directives",
    links: [
      { label: "Two-Way Binding", href: "/docs/:slug", slug: "two-way-binding" },
      { label: "Event Modifiers", href: "/docs/:slug", slug: "event-modifiers" },
      { label: "Async Lifecycle", href: "/docs/:slug", slug: "async-lifecycle" }
    ]
  },
  {
    title: "Routing & RPC",
    links: [
      { label: "File-Based Router", href: "/docs/:slug", slug: "router" },
      { label: "Server Functions", href: "/docs/:slug", slug: "server-functions" }
    ]
  }
];
