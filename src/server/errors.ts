/**
 * @fileoverview Standard HTTP error classes for Auwla server functions.
 */

export class HttpError extends Error {
  readonly status: number
  readonly details?: unknown

  constructor(status: number, message: string, details?: unknown) {
    super(message)
    this.name = 'HttpError'
    this.status = status
    this.details = details

    // Restore prototype chain
    Object.setPrototypeOf(this, new.target.prototype)
  }

  /**
   * Brand for identifying genuine HttpErrors across realms and duplicate
   * module copies (where `instanceof` fails). A prototype getter cannot be
   * forged with a plain object literal in a meaningful way and survives
   * structured cloning boundaries better than a class identity check.
   */
  get __auwla_httpError(): true {
    return true
  }
}

export class BadRequestError extends HttpError {
  constructor(message = 'Bad Request', details?: unknown) {
    super(400, message, details)
    this.name = 'BadRequestError'
  }
}

export class UnauthorizedError extends HttpError {
  constructor(message = 'Unauthorized') {
    super(401, message)
    this.name = 'UnauthorizedError'
  }
}

export class ForbiddenError extends HttpError {
  constructor(message = 'Forbidden') {
    super(403, message)
    this.name = 'ForbiddenError'
  }
}

export class NotFoundError extends HttpError {
  constructor(message = 'Not Found') {
    super(404, message)
    this.name = 'NotFoundError'
  }
}
