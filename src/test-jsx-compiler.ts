import { h, Fragment } from './index'
import { Counter } from './counter'

const root = document.getElementById('app')!
root.appendChild(<Counter />)
