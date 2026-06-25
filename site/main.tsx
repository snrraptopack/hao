import './index.css'
import { createMemoApp } from 'auwla'
import { Router } from 'auwla/router'
import routes from 'auwla:routes'
import { Pending } from './src/components/Pending'
import { Error } from "./src/components/Error"

const root = document.getElementById('app')
if (root) {
  createMemoApp(root, <Router
    routes={routes}
    suspend
    pendingComponent={Pending}
    errorComponent={Error}
  />
  )
}
