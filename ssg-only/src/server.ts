import { createBunAdapter } from 'auwla/adapters/bun';

const port = Number(process.env.PORT ?? 3000);

export default {
  port,
  fetch: createBunAdapter()
};
