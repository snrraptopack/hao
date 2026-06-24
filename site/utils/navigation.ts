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
    title: "Core Concepts",
    links: [
      { label: "State & Reactivity",   href: "/docs/:slug", slug: "state-reactivity" },
      { label: "How Rendering Works",  href: "/docs/:slug", slug: "setup-render" },
      { label: "Component Lifecycle",  href: "/docs/:slug", slug: "lifecycle" },
      { label: "Compiler",             href: "/docs/:slug", slug: "compiler" }
    ]
  },
  {
    title: "Guides",
    links: [
      { label: "Two-Way Binding",  href: "/docs/:slug", slug: "two-way-binding" },
      { label: "Event Modifiers",  href: "/docs/:slug", slug: "event-modifiers" },
      { label: "Async & Data",     href: "/docs/:slug", slug: "async-lifecycle" },
      { label: "CSS & Styling",    href: "/docs/:slug", slug: "css" }
    ]
  },
  {
    title: "Routing & RPC",
    links: [
      { label: "File-Based Router", href: "/docs/:slug", slug: "router" },
      { label: "Router API",        href: "/docs/:slug", slug: "router-api" },
      { label: "Server Functions",  href: "/docs/:slug", slug: "server-functions" },
      { label: "SSR",               href: "/docs/:slug", slug: "ssr" }
    ]
  },
  {
    title: "Reference",
    links: [
      { label: "API Reference",    href: "/docs/:slug", slug: "api-reference" }
    ]
  }
];
