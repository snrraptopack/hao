import { parseTemplate } from './parser';
import { analyzeTemplate } from './analyzer';
import { generateCode } from './codegen';

/**
 * Main compiler entry point
 * Converts .html template to executable JavaScript
 */
export function compile(htmlContent: string): string {
  // Step 1: Parse the HTML file (extract template and script)
  const parsed = parseTemplate(htmlContent);
  
  // Step 2: Analyze template structure (find @click, :value, etc.)
  const analyzed = analyzeTemplate(parsed.template);
  
  // Step 3: Generate LayoutBuilder code
  const code = generateCode(analyzed, parsed.script);
  
  return code;
}
