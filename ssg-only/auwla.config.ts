import { defineConfig } from 'auwla/config';

export default defineConfig({
  target: 'ssg',
  server: {
    entry: './src/server.ts'
  },
  router: {
    lazy: true
  }
});
