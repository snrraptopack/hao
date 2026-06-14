/**
 * @fileoverview Validation middleware helper for Auwla server functions.
 *
 * Supports Standard Schema (Zod, Valibot, etc.) and parses JSON bodies.
 */

import type { Middleware } from './types'
import type { StandardSchema, StandardSchemaIssue } from '../shared/standard-schema'
import { ValidationError } from '../shared/validation-error'

export type { StandardSchema, StandardSchemaIssue }
export { ValidationError }

function formDataToObject(form: FormData): Record<string, unknown> {
  const obj: Record<string, unknown> = {}
  form.forEach((value, key) => {
    if (key in obj) {
      const existing = obj[key]
      obj[key] = Array.isArray(existing) ? [...existing, value] : [existing, value]
    } else {
      obj[key] = value
    }
  })
  return obj
}

async function parseBody(request: Request): Promise<unknown> {
  const contentType = request.headers.get('content-type') ?? ''
  if (contentType.startsWith('multipart/form-data')) {
    return formDataToObject(await request.formData())
  }
  return request.json()
}

/**
 * Build a middleware that parses the request body (JSON or FormData) and
 * validates it with the given Standard Schema. The validated output is stored
 * in ctx.locals.input.
 */
export function validate<TOutput>(
  schema: StandardSchema<unknown, TOutput>,
): Middleware {
  return async (ctx, next) => {
    let body: unknown
    try {
      body = await parseBody(ctx.request)
    } catch {
      throw new ValidationError([{ message: 'Request body is missing or invalid' }])
    }

    const result = schema['~standard'].validate(body)
    if ('issues' in result) {
      throw new ValidationError(result.issues!)
    }

    ctx.locals.input = result.value
    return next()
  }
}
