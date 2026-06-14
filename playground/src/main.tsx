import {} from 'auwla/jsx-runtime'
import { createMemoApp } from 'auwla'
import { Router } from 'auwla/router'
import routes from 'auwla:routes'

const root = document.getElementById('app')
if (root) {
  createMemoApp(root, <Router routes={routes} />)
}
