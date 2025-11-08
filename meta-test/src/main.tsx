import { Router } from '../../src/index'
import { routes } from './routes'

// Mount router to #app and start
const container = document.getElementById('app')!
const router = new Router(routes, container)
router.start()