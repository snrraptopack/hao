import { Link, RouteComponent } from "auwla/router";
import { css } from 'auwla/css';
import * as styles from "./styles";
import { Dashboard } from "./dashboard";
import { Workspace } from "./workspace";

export const showcaseRoutes = [
  { path: "", component: Dashboard },
  { path: "/workspace", component: Workspace },
];

export function ShowcaseShell(Child: RouteComponent) {
  return () => (
    <div style={css(styles.globalLayout)}>
      {/* Sidebar */}
      <aside style={css(styles.sidebar)}>
        <div>
          <h2 style={css(styles.sidebarTitle)}>
            Creative Studio
          </h2>
          <span style={css(styles.sidebarSubtitle)}>
            Auwla Showcase
          </span>
        </div>

        <nav style={css(styles.sidebarNav)}>
          <Link
            href="/showcase"
            style={css(styles.sidebarLink)}
          >
            Dashboard
          </Link>
          <Link
            href="/showcase/workspace"
            style={css(styles.sidebarLink)}
          >
            AI Workspace
          </Link>
        </nav>

        <div style={css(styles.sidebarFooter)}>
          <div style={css(styles.avatar)} />
          <div>
            <div style={css(styles.avatarName)}>Demo User</div>
            <div style={css(styles.avatarEmail)}>designer@auwla.dev</div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div style={css(styles.contentWrapper)}>
        <Child />
      </div>
    </div>
  );
}
