import './index.css'
import { createMemoApp } from 'auwla'
import App from './app.js'

const root = document.getElementById('app')
if (root) {
  createMemoApp(root, <App />)
}
