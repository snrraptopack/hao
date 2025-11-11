import {setupBridge} from 'auwsomebridge';
import { allRoutes } from './all-routes';

export const {$api } = setupBridge(allRoutes, {
  prefix: '/api',
  runtime: 'bun',
});
