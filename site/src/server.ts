import { createBunAdapter } from 'auwla/adapters/bun';

const port = Number(process.env.PORT ?? 0);

export default {
  port,
  fetch: createBunAdapter()
};
