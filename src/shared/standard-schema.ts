/**
 * Minimal Standard Schema interface shared between client and server.
 *
 * Validation libraries like Zod, Valibot, and ArkType expose this shape,
 * so Auwla does not need to depend on any specific library.
 */
export interface StandardSchemaIssue {
  message: string
  path?: Array<string | number | symbol>
}

export interface StandardSchema<TInput = unknown, TOutput = TInput> {
  '~standard': {
    validate: (
      value: unknown,
    ) =>
      | { value: TOutput; issues?: undefined }
      | { issues: ReadonlyArray<StandardSchemaIssue>; value?: undefined }
  }
}
