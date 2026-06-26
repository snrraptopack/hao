import { defineConfig } from 'vite'
import { resolve } from 'path'
import { auwla } from 'auwla/vite'
import { auwlaRouter } from 'auwla/vite-router'

export default defineConfig({
  plugins: [auwla(), auwlaRouter()],

})
