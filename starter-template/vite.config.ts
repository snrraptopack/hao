import { defineConfig } from 'vite'
import { templateCompiler } from 'auwla-compiler/vite-plugin'

export default defineConfig({
    plugins: [
        templateCompiler({ verbose: true, emitDebugFiles: true })
    ],
    build: {
        target: 'es2020'
    }
})