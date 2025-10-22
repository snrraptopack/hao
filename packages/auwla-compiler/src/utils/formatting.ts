/**
 * Code formatting utilities
 */

/**
 * Indent code by specified number of spaces
 */
export function indent(code: string, spaces: number): string {
  const indentation = ' '.repeat(spaces)
  return code
    .split('\n')
    .map(line => line.trim() ? indentation + line : line)
    .join('\n')
}

/**
 * Clean up and normalize whitespace
 */
export function normalizeWhitespace(code: string): string {
  return code
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Format import statements
 */
export function formatImports(imports: string[]): string {
  if (imports.length === 0) return ''
  
  // Group imports by source
  const grouped = new Map<string, string[]>()
  
  for (const imp of imports) {
    const match = imp.match(/from\s+['"]([^'"]+)['"]/)
    if (match) {
      const source = match[1]
      if (!grouped.has(source)) {
        grouped.set(source, [])
      }
      grouped.get(source)!.push(imp)
    }
  }
  
  // Sort and format
  const sortedSources = Array.from(grouped.keys()).sort()
  const formattedImports: string[] = []
  
  for (const source of sortedSources) {
    const sourceImports = grouped.get(source)!
    formattedImports.push(...sourceImports)
  }
  
  return formattedImports.join('\n')
}

/**
 * Format function parameters
 */
export function formatParameters(params: Array<{ name: string; type?: string; defaultValue?: string }>): string {
  if (params.length === 0) return ''
  
  return params
    .map(param => {
      let result = param.name
      if (param.type) {
        result += `: ${param.type}`
      }
      if (param.defaultValue) {
        result += ` = ${param.defaultValue}`
      }
      return result
    })
    .join(', ')
}

/**
 * Format object properties
 */
export function formatObjectProps(props: Array<{ key: string; value: string }>): string {
  if (props.length === 0) return '{}'
  
  if (props.length === 1) {
    return `{ ${props[0].key}: ${props[0].value} }`
  }
  
  const formattedProps = props
    .map(prop => `  ${prop.key}: ${prop.value}`)
    .join(',\n')
  
  return `{\n${formattedProps}\n}`
}

/**
 * Ensure code ends with newline
 */
export function ensureNewline(code: string): string {
  return code.endsWith('\n') ? code : code + '\n'
}

/**
 * Remove extra blank lines
 */
export function removeExtraBlankLines(code: string): string {
  return code.replace(/\n\s*\n\s*\n/g, '\n\n')
}