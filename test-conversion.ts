// Test what the converted content should look like

const originalContent = `// @page /

<script>
  import { ref } from 'auwla'
  
  const count = ref(0)
  const message = ref('Welcome to Auwla!')
</script>

<div class="container mx-auto p-8">
  <h1 class="text-4xl font-bold mb-4">{message}</h1>
  <p class="text-lg mb-6">A lightweight, reactive UI framework</p>
  
  <div class="space-y-4">
    <button 
      class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
      onClick={() => count.value++}
    >
      Clicked {count.value} times
    </button>
    
    <div class="text-gray-600">
      This is a reactive counter powered by Auwla's state management.
    </div>
  </div>
</div>`;

function convertNewTemplateToOldFormat(content: string, componentName: string): string {
  // Extract @page directive and other comments
  const pageMatch = content.match(/\/\/\s*@page\s+(.+)/);
  const comments = content.match(/^\/\/.*$/gm) || [];
  
  // Extract script section
  const scriptMatch = content.match(/<script[^>]*>([\s\S]*?)<\/script>/);
  const scriptContent = scriptMatch ? scriptMatch[1].trim() : '';
  
  // Extract template section (everything after </script>)
  const scriptEndIndex = content.indexOf('</script>');
  const templateContent = scriptEndIndex !== -1 
    ? content.substring(scriptEndIndex + 9).trim()
    : content.trim();
  
  // Build the old format
  let convertedContent = '';
  
  // Add comments
  convertedContent += comments.join('\n') + '\n\n';
  
  // Add script section
  if (scriptContent) {
    convertedContent += `<script>\n${scriptContent}\n</script>\n\n`;
  }
  
  // Add component function wrapper
  convertedContent += `export default function ${componentName}() {\n`;
  convertedContent += `  return (\n`;
  convertedContent += `    <>\n`;
  convertedContent += `      ${templateContent}\n`;
  convertedContent += `    </>\n`;
  convertedContent += `  )\n`;
  convertedContent += `}\n`;
  
  return convertedContent;
}

const converted = convertNewTemplateToOldFormat(originalContent, 'HomePage');
console.log('Converted content:');
console.log(converted);