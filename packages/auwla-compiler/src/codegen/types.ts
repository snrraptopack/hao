// Shared types and interfaces for codegen
import type { AuwlaFile } from '../auwla-parser.js'

// Module-level storage for current parsed file context
export let currentParsedFile: AuwlaFile | null = null

export function setCurrentParsedFile(file: AuwlaFile) {
  currentParsedFile = file
}

export function getCurrentParsedFile(): AuwlaFile | null {
  return currentParsedFile
}