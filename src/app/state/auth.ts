import { ref } from '../../state'

// Simple auth state used by the Admin guard and UI toggle
export const isAuthed = ref(false)

export function toggleAuth() {
  isAuthed.value = !isAuthed.value
}

export function login() {
  isAuthed.value = true
}

export function logout() {
  isAuthed.value = false
}