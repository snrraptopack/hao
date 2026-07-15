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
    title: "Core Concepts",
    links: [
      { label: "State & Reactivity", href: "/docs/:slug", slug: "state-reactivity" },
      { label: "Working With State", href: "/docs/:slug", slug: "working-with-state" },
      { label: "How Rendering Works", href: "/docs/:slug", slug: "setup-render" },
      { label: "What the Compiler Can't See", href: "/docs/:slug", slug: "what-the-compiler-cant-see" },
      { label: "Shared & Global State", href: "/docs/:slug", slug: "shared-state" },
      { label: "Component Lifecycle", href: "/docs/:slug", slug: "lifecycle" }
    ]
  },
  {
    title: "Guides",
    links: [
      { label: "Two-Way Binding", href: "/docs/:slug", slug: "two-way-binding" },
      { label: "Event Modifiers", href: "/docs/:slug", slug: "event-modifiers" }
    ]
  },
  {
    title: "Router",
    links: [
      { label: "File-Based Router", href: "/docs/:slug", slug: "router" },
      { label: "Link Component", href: "/docs/:slug", slug: "link-component" },
      { label: "Loading Data", href: "/docs/:slug", slug: "loading-data" },
      { label: "Route Caching", href: "/docs/:slug", slug: "route-caching" },
      { label: "Router Utilities", href: "/docs/:slug", slug: "router-utils" },
      { label: "Error Component", href: "/docs/:slug", slug: "error-component" },
      { label: "Page Exports", href: "/docs/:slug", slug: "page-exports" },
      { label: "Rendering Modes", href: "/docs/:slug", slug: "rendering-modes" },
      { label: "Head Management", href: "/docs/:slug", slug: "head-management" }
    ]
  },
  {
    title: "Fullstack",
    links: [
      { label: "Fullstack Setup", href: "/docs/:slug", slug: "fullstack-setup" },
      { label: "Track Primitive", href: "/docs/:slug", slug: "track-primitive" },
      { label: "Server Functions", href: "/docs/:slug", slug: "server-functions" },
      { label: "Query Caching", href: "/docs/:slug", slug: "query-caching" },
      { label: "Middlewares", href: "/docs/:slug", slug: "middlewares" },
      { label: "Server Utilities", href: "/docs/:slug", slug: "server-utils" },
      { label: "Configuring Auwla", href: "/docs/:slug", slug: "configuring-auwla" }
    ]
  },
  {
    title: "Reference",
    links: [
      { label: "API Reference", href: "/docs/:slug", slug: "api-reference" }
    ]
  }
];
