import { parseAuwlaFile } from './auwla-parser';
import { analyzeJSX, expressionToString } from './jsx-analyzer';
import { readFileSync } from 'fs';

// Test both files
const files = [
  './template/examples/Hello.auwla',
  './template/examples/TodoList-jsx.auwla'
];

for (const file of files) {
  console.log('\n' + '='.repeat(60));
  console.log(`📄 Testing: ${file}`);
  console.log('='.repeat(60));
  
  const content = readFileSync(file, 'utf8');
  const parseResult = parseAuwlaFile(content);

  console.log('\n📄 File Structure:');
  console.log('  Imports:', parseResult.imports.length);
  console.log('  Types:', parseResult.types.length);
  console.log('  Helpers:', parseResult.helpers.length);
  console.log('  Components:', parseResult.components.length);

  for (const component of parseResult.components) {
    console.log('\n' + '-'.repeat(60));
    console.log(`\n🧩 Component: ${component.name}`);
    console.log('  Parameters:', component.params.length);
    
    // Analyze JSX
    const jsxNodes = analyzeJSX(component.body);
    
    console.log('\n📊 JSX Structure:');
    console.log('  Root nodes:', jsxNodes.length);
    
    // Pretty print the JSX tree
    for (const node of jsxNodes) {
      printJSXNode(node, 2);
    }
  }
}

console.log('\n' + '='.repeat(60));

/**
 * Pretty print JSX node tree
 */
function printJSXNode(node: any, indent: number = 0) {
  const spaces = ' '.repeat(indent);
  
  if (node.type === 'element') {
    console.log(`${spaces}<${node.tag}>`);
    
    // Print directives
    if (node.directives && node.directives.length > 0) {
      for (const directive of node.directives) {
        console.log(`${spaces}  @${directive.name}=${expressionToString(directive.value)}`);
      }
    }
    
    // Print props
    if (node.props && node.props.length > 0) {
      for (const prop of node.props) {
        if (prop.isSpread) {
          console.log(`${spaces}  {...${expressionToString(prop.value)}}`);
        } else {
          const value = prop.value ? expressionToString(prop.value) : '';
          console.log(`${spaces}  ${prop.name}="${value}"`);
        }
      }
    }
    
    // Print children
    if (node.children && node.children.length > 0) {
      for (const child of node.children) {
        printJSXNode(child, indent + 2);
      }
    }
    
    console.log(`${spaces}</${node.tag}>`);
  } else if (node.type === 'text') {
    console.log(`${spaces}"${node.text}"`);
  } else if (node.type === 'expression') {
    console.log(`${spaces}{${expressionToString(node.expression)}}`);
  }
}
