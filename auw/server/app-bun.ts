import { setupBridge } from 'auwsomebridge';
import indexhtml from "../index.html"
import { allRoutes } from './all-routes';


const {middleware } = setupBridge(allRoutes, {
  prefix: '/api',
  validateResponses: true,
  logRequests: true,
  // Explicitly select Bun runtime (optional; autodetect works in Bun)
  runtime: 'bun',
});

// Start Bun server with native HTTP
Bun.serve({
  port: 3000,
  routes: {
    "/api/*": middleware,
    '/*': indexhtml,
  },
});

console.log('🚀 Bun server running at http://localhost:3000');
console.log('API routes available at /api/*');
