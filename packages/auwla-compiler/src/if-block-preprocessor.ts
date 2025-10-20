/**
 * Preprocessor to transform $if(condition){...} block syntax into valid JSX
 * 
 * Transforms:
 *   $if(condition) {
 *     <div>content</div>
 *   }
 * 
 * Into:
 *   $if(condition, 
 *     <div>content</div>
 *   )
 */

export function preprocessIfBlocks(code: string): string {
  // Pattern to match $if(condition) { ... }
  // This is a simplified regex - for production we'd want a proper parser
  const ifBlockPattern = /\$if\s*\(\s*([^)]+)\s*\)\s*\{([^}]*(?:\{[^}]*\}[^}]*)*)\}/gs;
  
  return code.replace(ifBlockPattern, (match, condition, block) => {
    // Clean up the block content
    const cleanBlock = block.trim();
    
    // Transform to function call syntax
    return `$if(${condition}, ${cleanBlock})`;
  });
}

/**
 * More robust preprocessor using a simple state machine
 */
export function preprocessIfBlocksRobust(code: string): string {
  const lines = code.split('\n');
  const result: string[] = [];
  let i = 0;
  
  while (i < lines.length) {
    const line = lines[i];
    
    // Check if this line contains $if(...) {
    const ifMatch = line.match(/^(\s*)\{\s*\$if\s*\(\s*([^)]+)\s*\)\s*\{\s*$/);
    
    if (ifMatch) {
      const indent = ifMatch[1];
      const condition = ifMatch[2];
      
      // Find the matching closing brace
      let braceCount = 1;
      let j = i + 1;
      const blockLines: string[] = [];
      
      while (j < lines.length && braceCount > 0) {
        const blockLine = lines[j];
        
        // Count braces to find the end of the block
        for (const char of blockLine) {
          if (char === '{') braceCount++;
          if (char === '}') braceCount--;
        }
        
        if (braceCount > 0) {
          blockLines.push(blockLine);
        } else {
          // This is the closing brace line, but we need to handle the outer }
          const beforeClosing = blockLine.substring(0, blockLine.lastIndexOf('}'));
          if (beforeClosing.trim()) {
            blockLines.push(beforeClosing);
          }
        }
        
        j++;
      }
      
      // Transform to function call syntax
      result.push(`${indent}{$if(${condition},`);
      result.push(...blockLines);
      result.push(`${indent})}`);
      
      i = j;
    } else {
      result.push(line);
      i++;
    }
  }
  
  return result.join('\n');
}