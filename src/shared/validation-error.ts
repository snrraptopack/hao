import type { StandardSchemaIssue } from './standard-schema'

export class ValidationError extends Error {
  readonly issues: ReadonlyArray<StandardSchemaIssue>

  constructor(issues: ReadonlyArray<StandardSchemaIssue>) {
    super(`Validation failed: ${issues[0]?.message ?? 'invalid input'}`)
    this.name = 'ValidationError'
    this.issues = issues
  }
}
