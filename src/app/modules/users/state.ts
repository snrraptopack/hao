import { ref } from '../../../state'

// Track last viewed user id outside lifecycle hooks for reuse
export const lastViewedUserId = ref<string | null>(null)