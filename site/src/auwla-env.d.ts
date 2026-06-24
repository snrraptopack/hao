/// <reference types="vite/client" />

declare module 'auwla:routes' {
  import type { Route } from 'auwla/router';
  const routes: Route[];
  export default routes;
}
