import { h, Link } from 'auwla'
import { CodeBlock } from '../../../components/CodeBlock'

export function DocsRoutingTips() {
  return (
    <section class="docs-prose">
      <h1>Routing: Tips &amp; Patterns</h1>
      <p>
        Practical guidance on organizing routes in modules, exporting them cleanly, and composing
        everything at the app level with guards and layouts.
      </p>

      <h2>Recommended Structure</h2>
      <p>Keep each feature’s routes in its own module and export a single <code>defineRoutes</code> result.</p>
      <CodeBlock language="txt" filename="SuggestedStructure.txt" code={`src/
  app/
    modules/
      users/
        UsersList.tsx
        UserDetail.tsx
        routes.tsx        // export usersRoutes
      posts/
        PostsList.tsx
        PostDetail.tsx
        routes.tsx        // export postsRoutes
      admin/
        AdminDashboard.tsx
        guard.ts          // export adminGuard
        routes.tsx        // export adminRoutes
    layouts/
      AppLayout.tsx
    pages/
      Landing.tsx
    routes.tsx           // compose all module routes
`} />

      <h2>Module Exports</h2>
      <p>Each module should export a constant array created with <code>defineRoutes</code>:</p>
      <CodeBlock language="tsx" filename="modules/users/routes.tsx" code={`import { h, defineRoutes } from 'auwla'
import { UsersList } from './UsersList'
import { UserDetail } from './UserDetail'

export const usersRoutes = defineRoutes([
  { path: '/users', component: () => <UsersList /> },
  { path: '/users/:id', component: () => <UserDetail /> },
])
`} />

      <h2>Compose at the App Level</h2>
      <p>Aggregate all module routes and apply groups for shared <code>layout</code> and <code>guard</code>.</p>
      <CodeBlock language="tsx" filename="app/routes.tsx" code={`import { h, composeRoutes, group, defineRoutes } from 'auwla'
import { AppLayout } from './layouts/AppLayout'
import { Landing } from './pages/Landing'
import { usersRoutes } from './modules/users/routes'
import { postsRoutes } from './modules/posts/routes'
import { adminRoutes } from './modules/admin/routes'
import { adminGuard } from './modules/admin/guard'

// Base route at '/'
export const baseRoutes = defineRoutes([
  { path: '/', component: () => <Landing /> },
])

// Group app features under /app with a shared layout
export const appGrouped = group('/app', { layout: AppLayout }, composeRoutes(
  usersRoutes,
  postsRoutes,
))

// Group admin under /admin with guard + shared layout
export const adminGrouped = group('/admin', { guard: adminGuard, layout: AppLayout }, adminRoutes)

// Final composition used by the Router
export const allRoutes = composeRoutes(baseRoutes, appGrouped, adminGrouped)
`} />

      <h2>Guards &amp; Layouts</h2>
      <ul>
        <li>Put guards on groups when a whole section needs protection (e.g., <code>/admin</code>).</li>
        <li>Use a shared layout at group level for consistent shells (nav, sidebars, etc.).</li>
        <li>Reserve route-level <code>guard</code>/<code>layout</code> for special cases only.</li>
      </ul>
      <CodeBlock language="ts" filename="modules/admin/guard.ts" code={`import type { RouteGuard } from 'auwla'

export const adminGuard: RouteGuard = () => {
  // Example: return isAuthenticated.value
  return true
}
`} />

      <h2>Named Routes &amp; Path Builders</h2>
      <p>Use <code>name</code> for programmatic navigation and <code>pathFor</code> to build URLs safely.</p>
      <CodeBlock language="tsx" filename="names-and-paths.tsx" code={`import { h, Link, pathFor } from 'auwla'

// Name routes for pushNamed
const usersRoutes = defineRoutes([
  { path: '/users', component: () => <UsersList />, name: 'users-list' },
  { path: '/users/:id', component: () => <UserDetail />, name: 'user-detail' },
])

// Programmatic navigation
router.pushNamed('user-detail', { id: '42' })

// Build paths for links or pushes
const url = pathFor('/users/:id', { id: 42 }, { tab: 'posts' })
<Link to={url} text="Open User Posts" />
`} />

      <h2>Path Conventions</h2>
      <ul>
        <li>Always start paths with <code>'/'</code> in <code>defineRoutes</code> children.</li>
        <li>When creating links, use the full path as it appears after grouping (e.g., <code>/app/users/:id</code>).</li>
        <li>Be consistent with trailing slashes; active detection compares paths exactly (query ignored).</li>
      </ul>

      <h2>Params &amp; Query Tips</h2>
      <ul>
        <li>Prefer passing <code>(params, query)</code> as props for explicit interfaces.</li>
        <li>Use <code>useParams()</code>/<code>useQuery()</code> for direct route-bound components.</li>
        <li>Reach for <code>onRouted</code> when you need route-scoped effects and caching.</li>
      </ul>
      <p>
        See <Link to="/docs/routing/params-and-query" text="Params & Query" /> for detailed patterns.
      </p>

      <h2>Maintainability</h2>
      <ul>
        <li>Keep module routes self-contained; export one constant per module.</li>
        <li>Compose in one place (e.g., <code>app/routes.tsx</code>) to visualize the app map.</li>
        <li>Use descriptive <code>name</code>s (e.g., <code>users-detail</code>, <code>admin-dashboard</code>) for clarity.</li>
      </ul>

      <p>
        Also see <Link to="/docs/routing/" text="Routing: Introduction" /> and{' '}
        <Link to="/docs/routing/composition" text="Route Composition" />.
      </p>
    </section>
  ) as HTMLElement
}