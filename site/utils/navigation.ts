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
      { label: "Introduction",  href: "/docs/:slug", slug: "introduction" },
      { label: "Installation",  href: "/docs/:slug", slug: "installation" },
      { label: "Quick Start",   href: "/docs/:slug", slug: "quick-start" }
    ]
  },
  {
    // "Core Concepts" starts with plain reactivity examples, then explains
    // Auwla's two-phase model, and finally covers component lifecycle.
    title: "Core Concepts",
    links: [
      { label: "State & Reactivity",   href: "/docs/:slug", slug: "state-reactivity" },
      { label: "How Rendering Works",  href: "/docs/:slug", slug: "setup-render" },
      { label: "Component Lifecycle",  href: "/docs/:slug", slug: "lifecycle" }
    ]
  },
  {
    // "Guides" covers practical, task-oriented topics: forms, events, async.
    // We deliberately avoid the word "Directives" — Auwla has no directive system.
    title: "Guides",
    links: [
      { label: "Two-Way Binding",  href: "/docs/:slug", slug: "two-way-binding" },
      { label: "Event Modifiers",  href: "/docs/:slug", slug: "event-modifiers" },
      { label: "Async & Data",     href: "/docs/:slug", slug: "async-lifecycle" }
    ]
  },
  {
    title: "Routing & RPC",
    links: [
      { label: "File-Based Router",   href: "/docs/:slug", slug: "router" },
      { label: "Server Functions",    href: "/docs/:slug", slug: "server-functions" }
    ]
  }
];
