import { defineConfig } from 'auwla/config';

export default defineConfig({
  target: 'ssg',
  router: {
    lazy: true
  }
});
