import { defineConfig } from 'auwla/config';

export default defineConfig({
  target: 'island',
  server: {
    entry: './src/server.ts'
  },
  router: {
    lazy: true
  } //there is an issue with the lazy chunking will look into it
});
