/**
 * @fileoverview Validation middleware helper for Auwla server functions.
 *
 * Supports Standard Schema (Zod, Valibot, etc.) and parses JSON bodies.
 */

import type { Middleware } from './types'

/**
 * Minimal Standard Schema interface.
 *
 * Libraries like Zod and Valibot expose this shape, so no direct dependency
 * is required.
 */
export interface StandardSchema<TInput = unknown, TOutput = TInput> {
  '~standard': {
    validate: (
      value: unknown,
    ) =>
      | { value: TOutput; issues?: undefined }
      | { issues: ReadonlyArray<StandardSchemaIssue>; value?: undefined }
  }
}

export interface StandardSchemaIssue {
  message: string
  path?: Array<string | number | symbol>
}

export class ValidationError extends Error {
  readonly issues: ReadonlyArray<StandardSchemaIssue>

  constructor(issues: ReadonlyArray<StandardSchemaIssue>) {
    super(`Validation failed: ${issues[0]?.message ?? 'invalid input'}`)
    this.name = 'ValidationError'
    this.issues = issues
  }
}

/**
 * Build a middleware that parses the request body as JSON and validates it
 * with the given Standard Schema. The validated output is stored in
 * ctx.locals.input.
 */
export function validate<TOutput>(
  schema: StandardSchema<unknown, TOutput>,
): Middleware {
  return async (ctx, next) => {
    let body: unknown
    try {
      body = await ctx.request.json()
    } catch {
      throw new ValidationError([{ message: 'Request body must be valid JSON' }])
    }

    const result = schema['~standard'].validate(body)
    if ('issues' in result) {
      throw new ValidationError(result.issues!)
    }

    ctx.locals.input = result.value
    return next()
  }
}
