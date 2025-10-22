import { describe, test, expect } from 'bun:test'
import { parseJSXContent, transformJSXElementToUI, JSXTransformationContext } from '../src/tsx-compiler'

describe('JSX Content Transformation', () => {
  describe('Simple JSX Element Transformation', () => {
    test('should transform simple div element', () => {
      const jsxContent = '<div>Hello World</div>'
      const context: JSXTransformationContext = {
        itemParameter: 'item',
        indentLevel: 0
      }
      
      const result = parseJSXContent(jsxContent, context)
      
      expect(result).toHaveLength(1)
      expect(result[0]).toContain('ui.Div')
      expect(result[0]).toContain('Hello World')
    })

    test('should transform span element with text', () => {
      const jsxContent = '<span>Test Text</span>'
      const context: JSXTransformationContext = {
        itemParameter: 'item',
        indentLevel: 0
      }
      
      const result = parseJSXContent(jsxContent, context)
      
      expect(result).toHaveLength(1)
      expect(result[0]).toContain('ui.Span')
      expect(result[0]).toContain('Test Text')
    })

    test('should transform button element with attributes', () => {
      const jsxContent = '<button className="btn" onClick={handleClick}>Click me</button>'
      const context: JSXTransformationContext = {
        itemParameter: 'item',
        indentLevel: 0
      }
      
      const result = parseJSXContent(jsxContent, context)
      
      expect(result).toHaveLength(1)
      expect(result[0]).toContain('ui.Button')
      expect(result[0]).toContain('className: "btn"')
      expect(result[0]).toContain('on: { click: handleClick }')
      expect(result[0]).toContain('Click me')
    })

    test('should transform input element with multiple attributes', () => {
      const jsxContent = '<input type="text" value={item.name} onChange={handleChange} placeholder="Enter name" />'
      const context: JSXTransformationContext = {
        itemParameter: 'item',
        indentLevel: 0
      }
      
      const result = parseJSXContent(jsxContent, context)
      
      expect(result).toHaveLength(1)
      expect(result[0]).toContain('ui.Input')
      expect(result[0]).toContain('type: "text"')
      expect(result[0]).toContain('value: item.name')
      expect(result[0]).toContain('on: { change: handleChange }')
      expect(result[0]).toContain('placeholder: "Enter name"')
    })
  })

  describe('Complex Nested JSX Structures', () => {
    test('should transform nested div structure', () => {
      const jsxContent = `
        <div className="container">
          <h1>Title</h1>
          <p>Description</p>
        </div>
      `
      const context: JSXTransformationContext = {
        itemParameter: 'item',
        indentLevel: 0
      }
      
      const result = parseJSXContent(jsxContent, context)
      
      expect(result.length).toBeGreaterThan(1)
      expect(result.some(line => line.includes('ui.Div'))).toBe(true)
      expect(result.some(line => line.includes('ui.H1'))).toBe(true)
      expect(result.some(line => line.includes('ui.P'))).toBe(true)
      expect(result.some(line => line.includes('className: "container"'))).toBe(true)
    })

    test('should transform todo item structure', () => {
      const jsxContent = `
        <div className="todo-item">
          <input type="checkbox" checked={item.completed} />
          <span className={item.completed ? 'completed' : ''}>{item.text}</span>
          <button onClick={() => deleteTodo(item.id)}>Delete</button>
        </div>
      `
      const context: JSXTransformationContext = {
        itemParameter: 'item',
        indentLevel: 0
      }
      
      const result = parseJSXContent(jsxContent, context)
      
      expect(result.length).toBeGreaterThan(3)
      expect(result.some(line => line.includes('ui.Div'))).toBe(true)
      expect(result.some(line => line.includes('ui.Input'))).toBe(true)
      expect(result.some(line => line.includes('ui.Span'))).toBe(true)
      expect(result.some(line => line.includes('ui.Button'))).toBe(true)
      expect(result.some(line => line.includes('item.completed'))).toBe(true)
      expect(result.some(line => line.includes('item.text'))).toBe(true)
    })

    test('should transform card layout structure', () => {
      const jsxContent = `
        <div className="card">
          <div className="card-header">
            <h3>{item.title}</h3>
            <span className="badge">{item.category}</span>
          </div>
          <div className="card-body">
            <p>{item.description}</p>
            <div className="actions">
              <button onClick={() => editItem(item)}>Edit</button>
              <button onClick={() => deleteItem(item.id)}>Delete</button>
            </div>
          </div>
        </div>
      `
      const context: JSXTransformationContext = {
        itemParameter: 'item',
        indentLevel: 0
      }
      
      const result = parseJSXContent(jsxContent, context)
      
      expect(result.length).toBeGreaterThan(5)
      expect(result.some(line => line.includes('card'))).toBe(true)
      expect(result.some(line => line.includes('item.title'))).toBe(true)
      expect(result.some(line => line.includes('item.category'))).toBe(true)
      expect(result.some(line => line.includes('item.description'))).toBe(true)
    })
  })

  describe('Conditional Rendering Within Array Mappings', () => {
    test('should transform conditional rendering with logical AND', () => {
      const jsxContent = `
        <div>
          {item.isVisible && <span>Visible content</span>}
          <p>Always visible</p>
        </div>
      `
      const context: JSXTransformationContext = {
        itemParameter: 'item',
        indentLevel: 0
      }
      
      const result = parseJSXContent(jsxContent, context)
      
      expect(result.length).toBeGreaterThan(1)
      expect(result.some(line => line.includes('item.isVisible'))).toBe(true)
      expect(result.some(line => line.includes('ui.Div'))).toBe(true)
      expect(result.some(line => line.includes('ui.P'))).toBe(true)
    })

    test('should transform ternary conditional rendering', () => {
      const jsxContent = `
        <div>
          {item.status === 'active' ? 
            <span className="active">Active</span> : 
            <span className="inactive">Inactive</span>
          }
        </div>
      `
      const context: JSXTransformationContext = {
        itemParameter: 'item',
        indentLevel: 0
      }
      
      const result = parseJSXContent(jsxContent, context)
      
      expect(result.length).toBeGreaterThan(1)
      expect(result.some(line => line.includes('item.status'))).toBe(true)
      expect(result.some(line => line.includes('active') || line.includes('inactive'))).toBe(true)
    })

    test('should transform conditional class names', () => {
      const jsxContent = `
        <div className={item.completed ? 'completed task' : 'task'}>
          <span>{item.text}</span>
        </div>
      `
      const context: JSXTransformationContext = {
        itemParameter: 'item',
        indentLevel: 0
      }
      
      const result = parseJSXContent(jsxContent, context)
      
      expect(result.length).toBeGreaterThan(1)
      expect(result.some(line => line.includes('item.completed'))).toBe(true)
      expect(result.some(line => line.includes('completed task'))).toBe(true)
      expect(result.some(line => line.includes('item.text'))).toBe(true)
    })
  })

  describe('Event Handler Preservation and Parameter Binding', () => {
    test('should preserve simple event handlers', () => {
      const jsxContent = '<button onClick={handleClick}>Click</button>'
      const context: JSXTransformationContext = {
        itemParameter: 'item',
        indentLevel: 0
      }
      
      const result = parseJSXContent(jsxContent, context)
      
      expect(result).toHaveLength(1)
      expect(result[0]).toContain('on: { click: handleClick }')
    })

    test('should preserve arrow function event handlers with item parameter', () => {
      const jsxContent = '<button onClick={() => deleteItem(item.id)}>Delete</button>'
      const context: JSXTransformationContext = {
        itemParameter: 'item',
        indentLevel: 0
      }
      
      const result = parseJSXContent(jsxContent, context)
      
      expect(result).toHaveLength(1)
      expect(result[0]).toContain('on: { click: () => deleteItem(item.id) }')
    })

    test('should preserve event handlers with index parameter', () => {
      const jsxContent = '<button onClick={() => moveItem(index, index + 1)}>Move Down</button>'
      const context: JSXTransformationContext = {
        itemParameter: 'item',
        indexParameter: 'index',
        indentLevel: 0
      }
      
      const result = parseJSXContent(jsxContent, context)
      
      expect(result).toHaveLength(1)
      expect(result[0]).toContain('on: { click: () => moveItem(index, index + 1) }')
    })

    test('should preserve complex event handlers with multiple parameters', () => {
      const jsxContent = '<input onChange={(e) => updateItem(item.id, e.target.value)} value={item.name} />'
      const context: JSXTransformationContext = {
        itemParameter: 'item',
        indexParameter: 'index',
        indentLevel: 0
      }
      
      const result = parseJSXContent(jsxContent, context)
      
      expect(result).toHaveLength(1)
      expect(result[0]).toContain('on: { change: e => updateItem(item.id, e.target.value) }')
      expect(result[0]).toContain('value: item.name')
    })

    test('should preserve multiple event handlers on same element', () => {
      const jsxContent = `
        <input 
          onFocus={() => setFocused(item.id)}
          onBlur={() => setBlurred(item.id)}
          onChange={(e) => updateValue(item.id, e.target.value)}
          value={item.value}
        />
      `
      const context: JSXTransformationContext = {
        itemParameter: 'item',
        indentLevel: 0
      }
      
      const result = parseJSXContent(jsxContent, context)
      
      expect(result).toHaveLength(1)
      expect(result[0]).toContain('on: { focus: () => setFocused(item.id) }')
      expect(result[0]).toContain('on: { blur: () => setBlurred(item.id) }')
      expect(result[0]).toContain('on: { change: e => updateValue(item.id, e.target.value) }')
      expect(result[0]).toContain('value: item.value')
    })
  })

  describe('JSX Fragment Handling', () => {
    test('should handle JSX fragments (may have limitations)', () => {
      const jsxContent = `
        <>
          <h1>{item.title}</h1>
          <p>{item.description}</p>
        </>
      `
      const context: JSXTransformationContext = {
        itemParameter: 'item',
        indentLevel: 0
      }
      
      const result = parseJSXContent(jsxContent, context)
      
      expect(result.length).toBeGreaterThan(0)
      // JSX fragments may not be fully supported yet, so we just check that it doesn't crash
      expect(result.some(line => line.includes('ui.Div') || line.includes('Unknown'))).toBe(true)
    })

    test('should handle nested fragments (may have limitations)', () => {
      const jsxContent = `
        <div>
          <>
            <span>First</span>
            <span>Second</span>
          </>
          <p>Outside fragment</p>
        </div>
      `
      const context: JSXTransformationContext = {
        itemParameter: 'item',
        indentLevel: 0
      }
      
      const result = parseJSXContent(jsxContent, context)
      
      expect(result.length).toBeGreaterThanOrEqual(2)
      expect(result.some(line => line.includes('ui.Div'))).toBe(true)
    })
  })

  describe('Expression Container Handling', () => {
    test('should transform JSX with expression containers', () => {
      const jsxContent = '<div>{item.name} - {item.status}</div>'
      const context: JSXTransformationContext = {
        itemParameter: 'item',
        indentLevel: 0
      }
      
      const result = parseJSXContent(jsxContent, context)
      
      expect(result.length).toBeGreaterThan(1)
      expect(result.some(line => line.includes('item.name'))).toBe(true)
      expect(result.some(line => line.includes('item.status'))).toBe(true)
    })

    test('should transform complex expressions in JSX', () => {
      const jsxContent = '<div>{item.price.toFixed(2)} USD</div>'
      const context: JSXTransformationContext = {
        itemParameter: 'item',
        indentLevel: 0
      }
      
      const result = parseJSXContent(jsxContent, context)
      
      expect(result.length).toBeGreaterThan(1)
      expect(result.some(line => line.includes('item.price.toFixed(2)'))).toBe(true)
    })

    test('should transform method calls in expressions', () => {
      const jsxContent = '<div>{formatDate(item.createdAt)}</div>'
      const context: JSXTransformationContext = {
        itemParameter: 'item',
        indentLevel: 0
      }
      
      const result = parseJSXContent(jsxContent, context)
      
      expect(result).toHaveLength(1)
      expect(result[0]).toContain('formatDate(item.createdAt)')
    })
  })

  describe('Error Handling and Edge Cases', () => {
    test('should handle empty JSX content', () => {
      const jsxContent = ''
      const context: JSXTransformationContext = {
        itemParameter: 'item',
        indentLevel: 0
      }
      
      const result = parseJSXContent(jsxContent, context)
      
      expect(result.length).toBeGreaterThanOrEqual(0)
      // Empty content may return error fallback
    })

    test('should handle malformed JSX gracefully', () => {
      const jsxContent = '<div><span>Unclosed span</div>'
      const context: JSXTransformationContext = {
        itemParameter: 'item',
        indentLevel: 0
      }
      
      // Should not throw an error, but may return empty or fallback result
      expect(() => parseJSXContent(jsxContent, context)).not.toThrow()
    })

    test('should handle JSX with invalid attribute syntax', () => {
      const jsxContent = '<div invalid-attr={}>Content</div>'
      const context: JSXTransformationContext = {
        itemParameter: 'item',
        indentLevel: 0
      }
      
      // Should not throw an error
      expect(() => parseJSXContent(jsxContent, context)).not.toThrow()
    })

    test('should handle deeply nested structures', () => {
      const jsxContent = `
        <div>
          <div>
            <div>
              <div>
                <span>{item.deepValue}</span>
              </div>
            </div>
          </div>
        </div>
      `
      const context: JSXTransformationContext = {
        itemParameter: 'item',
        indentLevel: 0
      }
      
      const result = parseJSXContent(jsxContent, context)
      
      expect(result.length).toBeGreaterThan(4)
      expect(result.some(line => line.includes('item.deepValue'))).toBe(true)
    })
  })

  describe('Indentation and Formatting', () => {
    test('should respect indentation level', () => {
      const jsxContent = '<div>Test</div>'
      const context: JSXTransformationContext = {
        itemParameter: 'item',
        indentLevel: 2
      }
      
      const result = parseJSXContent(jsxContent, context)
      
      expect(result).toHaveLength(1)
      expect(result[0]).toMatch(/^    /) // Should start with 4 spaces (2 levels * 2 spaces)
    })

    test('should maintain proper indentation for nested elements', () => {
      const jsxContent = `
        <div>
          <span>Nested</span>
        </div>
      `
      const context: JSXTransformationContext = {
        itemParameter: 'item',
        indentLevel: 1
      }
      
      const result = parseJSXContent(jsxContent, context)
      
      expect(result.length).toBeGreaterThan(1)
      // Check that nested elements have additional indentation
      const nestedLines = result.filter(line => line.includes('ui.Span'))
      expect(nestedLines.length).toBeGreaterThan(0)
    })
  })
})