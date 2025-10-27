import { ref } from '../../../state'

// Track last viewed post id as external state if needed by other modules
export const lastViewedPostId = ref<string | null>(null)