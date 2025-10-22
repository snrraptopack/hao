import { defineConfig } from 'vite'
import { templateCompiler } from 'auwla-compiler'

export default defineConfig({
    plugins: [
        templateCompiler()
    ],
    build: {
        target: 'es2020'
    }
})