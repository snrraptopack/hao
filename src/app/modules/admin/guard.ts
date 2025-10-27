import type { RouteGuard } from '../../../router'
import { isAuthed } from '../../state/auth'

export const adminGuard: RouteGuard = () => {
  return isAuthed.value
}