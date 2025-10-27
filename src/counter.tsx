import { h } from "./jsx";
import { Router, setRouter } from "./router";
import { allRoutes } from "./app/routes";

// Bootstrapping router with modular routes
const mount = document.getElementById("app");
if (mount) {
  const router = new Router(allRoutes, mount);
  setRouter(router);
  router.start();
}