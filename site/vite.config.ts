import { defineConfig } from "vite"
import { auwla } from "auwla/vite"
import { auwlaRouter } from "auwla/vite-router"
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export default defineConfig({
  resolve: {
    alias: {
      '@docs': resolve(__dirname, './docs')
    }
  },
  plugins: [
    auwla(),
    auwlaRouter(),
    tailwindcss()
  ]
})
