import { createApp } from 'auwla'
import { routes } from '../.routes/index.js'

// Create and mount the app
const app = createApp({
  routes,
  target: '#app'
})

// Start the app
app.mount()