import { Router, setRouter } from 'auwla'
import './styles.css'
import 'prismjs/themes/prism-tomorrow.css'
import routes from './routes'

const container = document.getElementById('app')!
const router = new Router(routes, container)
setRouter(router)
router.start()