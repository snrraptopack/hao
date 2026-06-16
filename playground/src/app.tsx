import {} from 'auwla/jsx-runtime'
import { Router } from 'auwla/router'
import routes from '../.auwla/routes.js'

export default function App() {
  return <Router routes={routes} suspend />
}
