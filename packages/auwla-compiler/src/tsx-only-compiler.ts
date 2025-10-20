import { parseAuwlaFile, AuwlaFile } from './auwla-parser.js'
import { generateAuwlaFile } from './codegen/main.js'

/**
 * TSX-only compiler that leverages the existing auwla compiler infrastructure
 * This is a thin wrapper that focuses only on TSX parsing, reusing all the 
 * established JSX analysis and code generation patterns.
 */

/**
 * Preprocess $if(condition){block} syntax into valid JSX
 * Transforms: {$if(condition) { <jsx/> }} into {$if(condition, <jsx/>)}
 */
function preprocessIfBlocks(content: string): string {
  let result = content;
  
  // Pattern to match {$if(condition) { ... }}
  // We need to be careful with nested braces
  const lines = content.split('\n');
  const processedLines: string[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Look for {$if(condition) {
    const ifMatch = line.match(/^(\s*)\{\$if\s*\(\s*([^)]+)\s*\)\s*\{\s*$/);
    
    if (ifMatch) {
      const indent = ifMatch[1];
      const condition = ifMatch[2];
      
      // Collect the block content until we find the closing }}
      const blockLines: string[] = [];
      let j = i + 1;
      let braceCount = 1; // We already have one opening brace
      
      while (j < lines.length && braceCount > 0) {
        const blockLine = lines[j];
        
        // Count braces
        for (const char of blockLine) {
          if (char === '{') braceCount++;
          if (char === '}') braceCount--;
        }
        
        if (braceCount === 1 && blockLine.trim() === '}}') {
          // This is our closing }}
          break;
        } else if (braceCount > 0) {
          blockLines.push(blockLine);
        }
        
        j++;
      }
      
      // Transform to function call syntax
      processedLines.push(`${indent}{$if(${condition},`);
      processedLines.push(...blockLines);
      processedLines.push(`${indent})}`);
      
      i = j; // Skip the processed lines
    } else {
      processedLines.push(line);
    }
  }
  
  return processedLines.join('\n');
}

/**
 * Parse TSX file using the existing auwla parser
 * The existing parser already handles TSX files correctly
 */
export function parseTSXFile(content: string): AuwlaFile {
  // Preprocess $if blocks before parsing
  const preprocessed = preprocessIfBlocks(content);
  
  // The existing parseAuwlaFile already handles TSX files!
  // It detects the format and processes accordingly
  return parseAuwlaFile(preprocessed)
}

/**
 * Generate Auwla component from TSX using existing codegen
 * This leverages all the established patterns for JSX analysis,
 * config building, reactive expressions, etc.
 */
export function generateAuwlaFromTSX(parsed: AuwlaFile): string {
  // The existing generateAuwlaFile already handles everything correctly!
  // It has proper JSX analysis, config building, text handling, etc.
  return generateAuwlaFile(parsed)
}

/**
 * Complete TSX compilation pipeline
 */
export function compileTSX(content: string): string {
  const parsed = parseTSXFile(content)
  return generateAuwlaFromTSX(parsed)
}