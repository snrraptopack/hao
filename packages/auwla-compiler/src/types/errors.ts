/**
 * Error handling types for TSX compilation
 */

export class CompilationError extends Error {
  constructor(
    message: string,
    public file: string,
    public line?: number,
    public column?: number,
    public code?: string
  ) {
    super(message)
    this.name = 'CompilationError'
  }

  toString(): string {
    let result = `${this.name}: ${this.message}`
    if (this.file) {
      result += ` in ${this.file}`
    }
    if (this.line !== undefined) {
      result += `:${this.line}`
      if (this.column !== undefined) {
        result += `:${this.column}`
      }
    }
    return result
  }
}

export class ParseError extends CompilationError {
  constructor(message: string, file: string, line?: number, column?: number) {
    super(message, file, line, column)
    this.name = 'ParseError'
  }
}

export class ScopeError extends CompilationError {
  constructor(message: string, file: string, line?: number, column?: number) {
    super(message, file, line, column)
    this.name = 'ScopeError'
  }
}

export class JSXError extends CompilationError {
  constructor(message: string, file: string, line?: number, column?: number) {
    super(message, file, line, column)
    this.name = 'JSXError'
  }
}

export class GenerationError extends CompilationError {
  constructor(message: string, file: string, line?: number, column?: number) {
    super(message, file, line, column)
    this.name = 'GenerationError'
  }
}