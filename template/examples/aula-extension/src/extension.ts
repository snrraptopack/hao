import * as vscode from 'vscode';

/**
 * Activate the Auwla extension
 */
export function activate(context: vscode.ExtensionContext) {
  console.log('Auwla extension is now active!');

  // Enable TypeScript for .auwla files
  vscode.commands.executeCommand('setContext', 'auwla.enabled', true);
  
  // Associate .auwla files with TypeScript React language features
  vscode.languages.setLanguageConfiguration('auwla', {
    __characterPairSupport: {
      autoClosingPairs: [
        { open: '{', close: '}' },
        { open: '[', close: ']' },
        { open: '(', close: ')' },
        { open: '<', close: '>', notIn: ['string', 'comment'] },
        { open: '"', close: '"', notIn: ['string'] },
        { open: "'", close: "'", notIn: ['string', 'comment'] },
        { open: '`', close: '`', notIn: ['string', 'comment'] }
      ]
    }
  });

  // Register completion provider for .auwla files
  const completionProvider = vscode.languages.registerCompletionItemProvider(
    { language: 'auwla' },
    {
      provideCompletionItems(document: vscode.TextDocument, position: vscode.Position) {
        const completions: vscode.CompletionItem[] = [];
        
        const linePrefix = document.lineAt(position).text.substr(0, position.character);
        const isInJSX = linePrefix.includes('<') || linePrefix.includes('return (');
        
        // JSX Tag completions
        if (isInJSX || linePrefix.match(/<$/)) {
          const jsxTags = [
            // Container elements
            { tag: 'div', desc: 'Generic container element' },
            { tag: 'span', desc: 'Inline container element' },
            { tag: 'section', desc: 'Thematic grouping of content' },
            { tag: 'article', desc: 'Self-contained composition' },
            { tag: 'header', desc: 'Introductory content' },
            { tag: 'footer', desc: 'Footer for its nearest sectioning content' },
            { tag: 'main', desc: 'Dominant content' },
            { tag: 'nav', desc: 'Navigation links' },
            { tag: 'aside', desc: 'Indirectly related content' },
            
            // Text elements
            { tag: 'h1', desc: 'Heading level 1' },
            { tag: 'h2', desc: 'Heading level 2' },
            { tag: 'h3', desc: 'Heading level 3' },
            { tag: 'p', desc: 'Paragraph' },
            { tag: 'a', desc: 'Hyperlink', attrs: ' href=""' },
            { tag: 'strong', desc: 'Strong importance' },
            { tag: 'em', desc: 'Emphasized text' },
            { tag: 'code', desc: 'Inline code' },
            { tag: 'pre', desc: 'Preformatted text' },
            
            // List elements
            { tag: 'ul', desc: 'Unordered list' },
            { tag: 'ol', desc: 'Ordered list' },
            { tag: 'li', desc: 'List item' },
            
            // Form elements
            { tag: 'form', desc: 'Form' },
            { tag: 'input', desc: 'Input field', selfClosing: true },
            { tag: 'textarea', desc: 'Multi-line text input' },
            { tag: 'button', desc: 'Button' },
            { tag: 'label', desc: 'Label for form control' },
            { tag: 'select', desc: 'Dropdown select' },
            { tag: 'option', desc: 'Option in select' }
          ];

          jsxTags.forEach(({ tag, desc, attrs = '', selfClosing = false }) => {
            const completion = new vscode.CompletionItem(tag, vscode.CompletionItemKind.Property);
            completion.detail = `<${tag}> - ${desc}`;
            completion.documentation = new vscode.MarkdownString(`**JSX Element:** \`<${tag}>\`\n\n${desc}`);
            
            if (selfClosing) {
              completion.insertText = new vscode.SnippetString(`${tag}${attrs} $1/>`);
            } else {
              completion.insertText = new vscode.SnippetString(`${tag}${attrs}>$1</${tag}>`);
            }
            
            completions.push(completion);
          });
        }
        
        // Core Auwla functions

        // ref() - reactive reference
        const refCompletion = new vscode.CompletionItem('ref', vscode.CompletionItemKind.Function);
        refCompletion.detail = '(alias) ref<T>(value: T): Ref<T>';
        refCompletion.documentation = new vscode.MarkdownString(
          '**Create a reactive reference**\n\n```typescript\nfunction ref<T>(value: T): Ref<T>\n```\n\nReturns a reactive reference object with a `.value` property.\n\n**Example:**\n```typescript\nconst count = ref(0)\ncount.value++ // triggers reactivity\n```'
        );
        refCompletion.insertText = new vscode.SnippetString('ref($1)');
        completions.push(refCompletion);

        // watch() - reactive watcher
        const watchCompletion = new vscode.CompletionItem('watch', vscode.CompletionItemKind.Function);
        watchCompletion.detail = '(alias) watch<T>(deps: Ref<T>[], callback: () => void): void';
        watchCompletion.documentation = new vscode.MarkdownString(
          '**Watch reactive dependencies**\n\n```typescript\nfunction watch<T>(deps: Ref<T>[], callback: () => void): void\n```\n\nExecutes callback when any of the dependencies change.\n\n**Example:**\n```typescript\nwatch([count, name], () => {\n  console.log("Changed!")\n})\n```'
        );
        watchCompletion.insertText = new vscode.SnippetString('watch([$1], () => $2)');
        completions.push(watchCompletion);

        // $if() - conditional rendering
        const ifCompletion = new vscode.CompletionItem('$if', vscode.CompletionItemKind.Function);
        ifCompletion.detail = '(alias) $if(condition: boolean, render: () => JSX.Element): JSX.Element';
        ifCompletion.documentation = new vscode.MarkdownString(
          '**Conditional rendering**\n\n```typescript\nfunction $if(condition: boolean, render: () => JSX.Element): JSX.Element\n```\n\nRenders JSX only when condition is true. Compiles to `ui.When()`.\n\n**Example:**\n```typescript\n{$if(count.value > 5, () => (\n  <p>Count is greater than 5!</p>\n))}\n```'
        );
        ifCompletion.insertText = new vscode.SnippetString('$if($1, () => (\n  $2\n))');
        completions.push(ifCompletion);

        // $each() - list rendering
        const eachCompletion = new vscode.CompletionItem('$each', vscode.CompletionItemKind.Function);
        eachCompletion.detail = '(alias) $each<T>(items: T[], render: (item: T) => JSX.Element): JSX.Element';
        eachCompletion.documentation = new vscode.MarkdownString(
          '**List rendering**\n\n```typescript\nfunction $each<T>(items: T[], render: (item: T) => JSX.Element): JSX.Element\n```\n\nRenders a list of items. Compiles to `ui.List()` with efficient diffing.\n\n**Example:**\n```typescript\n{$each(todos.value, (todo) => (\n  <li key={todo.id}>{todo.text}</li>\n))}\n```'
        );
        eachCompletion.insertText = new vscode.SnippetString('$each($1, (${2:item}) => (\n  $3\n))');
        completions.push(eachCompletion);

        // Component() - component wrapper
        const componentCompletion = new vscode.CompletionItem('Component', vscode.CompletionItemKind.Function);
        componentCompletion.detail = '(alias) Component(render: (ui: UIBuilder) => void): Component';
        componentCompletion.documentation = new vscode.MarkdownString(
          '**Create an Auwla component**\n\n```typescript\nfunction Component(render: (ui: UIBuilder) => void): Component\n```\n\nWraps a component function with Auwla reactivity.\n\n**Example:**\n```typescript\nexport default Component((ui) => {\n  ui.Div({ className: "app" }, (ui) => {\n    // component content\n  })\n})\n```'
        );
        completions.push(componentCompletion);

        return completions;
      }
    },
    '$', 'r', 'w', 'C' // Trigger characters
  );

  // Enhanced hover provider with type signatures
  const hoverProvider = vscode.languages.registerHoverProvider(
    { language: 'auwla' },
    {
      provideHover(document: vscode.TextDocument, position: vscode.Position) {
        const range = document.getWordRangeAtPosition(position);
        const word = document.getText(range);

        const hovers: Record<string, vscode.MarkdownString> = {
          '$if': new vscode.MarkdownString(
            '```typescript\nfunction $if(condition: boolean, render: () => JSX.Element): JSX.Element\n```\n\n**Conditional rendering** - Renders JSX only when condition is true.\n\nCompiles to: `ui.When(watch([deps], () => condition), (ui) => { ... })`'
          ),
          '$each': new vscode.MarkdownString(
            '```typescript\nfunction $each<T>(items: T[], render: (item: T, index: number) => JSX.Element): JSX.Element\n```\n\n**List rendering** - Efficiently renders a list of items with automatic key tracking.\n\nCompiles to: `ui.List({ items, key, render })`'
          ),
          'ref': new vscode.MarkdownString(
            '```typescript\nfunction ref<T>(value: T): Ref<T>\n```\n\n**Reactive reference** - Creates a reactive value that triggers updates when changed.\n\nAccess/modify via `.value` property.'
          ),
          'watch': new vscode.MarkdownString(
            '```typescript\nfunction watch<T>(deps: Ref<T>[], callback: () => void): void\n```\n\n**Reactive watcher** - Executes callback whenever dependencies change.'
          ),
          'Component': new vscode.MarkdownString(
            '```typescript\nfunction Component(render: (ui: UIBuilder) => void): Component\n```\n\n**Component wrapper** - Wraps component logic with Auwla reactivity system.'
          )
        };

        return hovers[word] ? new vscode.Hover(hovers[word]) : null;
      }
    }
  );

  // Signature help provider for better function parameter hints
  const signatureProvider = vscode.languages.registerSignatureHelpProvider(
    { language: 'auwla' },
    {
      provideSignatureHelp(document, position) {
        const line = document.lineAt(position).text;
        const beforeCursor = line.substring(0, position.character);
        
        // Check for $if(
        if (beforeCursor.includes('$if(')) {
          const sigHelp = new vscode.SignatureHelp();
          const sig = new vscode.SignatureInformation(
            '$if(condition: boolean, render: () => JSX.Element)',
            new vscode.MarkdownString('Conditional rendering function')
          );
          sig.parameters = [
            new vscode.ParameterInformation('condition: boolean', 'When true, renders the JSX'),
            new vscode.ParameterInformation('render: () => JSX.Element', 'Function that returns JSX to render')
          ];
          sigHelp.signatures = [sig];
          sigHelp.activeSignature = 0;
          sigHelp.activeParameter = beforeCursor.split(',').length - 1;
          return sigHelp;
        }

        // Check for $each(
        if (beforeCursor.includes('$each(')) {
          const sigHelp = new vscode.SignatureHelp();
          const sig = new vscode.SignatureInformation(
            '$each<T>(items: T[], render: (item: T, index: number) => JSX.Element)',
            new vscode.MarkdownString('List rendering function')
          );
          sig.parameters = [
            new vscode.ParameterInformation('items: T[]', 'Array of items to render'),
            new vscode.ParameterInformation('render: (item: T, index: number) => JSX.Element', 'Function to render each item')
          ];
          sigHelp.signatures = [sig];
          sigHelp.activeSignature = 0;
          sigHelp.activeParameter = beforeCursor.split(',').length - 1;
          return sigHelp;
        }

        return null;
      }
    },
    '(', ','
  );

  context.subscriptions.push(completionProvider, hoverProvider, signatureProvider);
  
  // Register definition provider to enable Go to Definition
  const definitionProvider = vscode.languages.registerDefinitionProvider(
    { language: 'auwla' },
    {
      provideDefinition(document, position) {
        // Allow VS Code's TypeScript service to handle definitions
        return vscode.commands.executeCommand<vscode.Location[]>(
          'vscode.executeDefinitionProvider',
          document.uri,
          position
        );
      }
    }
  );
  
  // Register reference provider
  const referenceProvider = vscode.languages.registerReferenceProvider(
    { language: 'auwla' },
    {
      provideReferences(document, position, context) {
        return vscode.commands.executeCommand<vscode.Location[]>(
          'vscode.executeReferenceProvider',
          document.uri,
          position
        );
      }
    }
  );
  
  context.subscriptions.push(definitionProvider, referenceProvider);
}

/**
 * Deactivate the extension
 */
export function deactivate() {
  console.log('Auwla extension is now deactivated');
}
