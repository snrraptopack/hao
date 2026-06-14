/**
 * @fileoverview Form helper built on top of track.post.
 *
 * `track.form(key)` binds a server mutation to a <form>. It can run client-side
 * Standard Schema validation before sending, exposes pending/error/result state,
 * and provides an `onSubmit` handler for progressive-enhancement forms.
 */

import { reactive } from '../runtime/reactive'
import { track } from './track'
import type { CommandHandle } from './track'
import type { StandardSchema } from '../shared/standard-schema'
import { ValidationError } from '../shared/validation-error'
import type { ServerManifestTypes } from 'auwla/server-manifest'
import { getCurrentRoutePath } from '../client/rpc'

export type FormOptions = {
  /** Optional Standard Schema for client-side pre-flight validation. */
  schema?: StandardSchema
}

export type FormHandle<TArgs extends unknown[] = unknown[], TReturn = unknown> =
  CommandHandle<TArgs, TReturn> & {
    /** Client-side or server-side error from the last run. */
    readonly error: ValidationError | Error | null
    /** DOM submit handler. Prevents default and calls run(FormData). */
    onSubmit(event: SubmitEvent): void
    readonly props: {
      readonly action: string
      readonly method: 'POST'
      readonly onSubmit: (event: SubmitEvent) => void
    }
  }

type PostKeys = {
  [K in keyof ServerManifestTypes]: ServerManifestTypes[K] extends { method: 'POST' }
    ? K
    : never
}[keyof ServerManifestTypes]

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

function hasFiles(form: FormData): boolean {
  let found = false
  form.forEach((value) => {
    if (typeof value !== 'string') {
      found = true
    }
  })
  return found
}

function validateClientSide(
  schema: StandardSchema | undefined,
  args: unknown[],
): { value?: unknown; error?: ValidationError } {
  if (!schema) return {}

  const raw = args.length === 1 && args[0] instanceof FormData ? formDataToObject(args[0]) : args[0]
  const result = schema['~standard'].validate(raw)
  if ('issues' in result) {
    return { error: new ValidationError(result.issues!) }
  }
  return { value: result.value }
}

/**
 * Bind a POST remote function to a form.
 *
 * Usage:
 *   const createPost = track.form('posts.createPost', {
 *     schema: v.object({ title: v.string() })
 *   })
 *
 *   <form onSubmit={createPost.onSubmit}>
 *     <input name="title" />
 *     <button disabled={createPost.pending}>Save</button>
 *     {createPost.value?.title && <p>{createPost.value.title}</p>}
 *   </form>
 */
export function trackForm<K extends PostKeys>(
  key: K,
  options?: FormOptions,
): FormHandle<ServerManifestTypes[K]['args'], ServerManifestTypes[K]['return']> {
  const command = track.post(key) as CommandHandle<
    ServerManifestTypes[K]['args'],
    ServerManifestTypes[K]['return']
  >
  const originalRun = command.run as (...args: unknown[]) => Promise<unknown>
  const errorCell = reactive<ValidationError | Error | null>(null)

  async function run(...args: unknown[]): Promise<unknown> {
    errorCell.set(null)

    const { error } = validateClientSide(options?.schema, args)
    if (error) {
      errorCell.set(error)
      throw error
    }

    let finalArgs = args
    if (args.length === 1 && args[0] instanceof FormData && !hasFiles(args[0])) {
      finalArgs = [formDataToObject(args[0])]
    }

    try {
      return await originalRun(...finalArgs)
    } catch (err) {
      errorCell.set(err instanceof Error ? err : new Error(String(err)))
      throw err
    }
  }

  function onSubmit(event: SubmitEvent): void {
    event.preventDefault()
    const form = event.currentTarget
    if (!(form instanceof HTMLFormElement)) return
    run(new FormData(form))
  }

  Object.defineProperty(command, 'error', {
    enumerable: true,
    configurable: true,
    get(): ValidationError | Error | null {
      return errorCell.get()
    },
  })

  Object.defineProperty(command, 'props', {
    enumerable: true,
    configurable: true,
    get() {
      const routePath = encodeURIComponent(getCurrentRoutePath())
      return {
        action: `/_auwla/rpc?key=${key}&routePath=${routePath}`,
        method: 'POST' as const,
        onSubmit,
      }
    },
  })

  return Object.assign(command, {
    run: run as FormHandle<ServerManifestTypes[K]['args'], ServerManifestTypes[K]['return']>['run'],
    onSubmit,
  }) as FormHandle<ServerManifestTypes[K]['args'], ServerManifestTypes[K]['return']>
}
