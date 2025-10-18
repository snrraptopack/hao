import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
  console.log('Auwla extension activated');

  const AUWLA: vscode.DocumentFilter = { scheme: 'file', language: 'auwla' };

  // Simple completion provider
  const completionProvider = vscode.languages.registerCompletionItemProvider(
    AUWLA,
    {
      provideCompletionItems(document: vscode.TextDocument, position: vscode.Position) {
        const completion = new vscode.CompletionItem('ui.Div', vscode.CompletionItemKind.Snippet);
        completion.detail = 'Auwla UI element';
        completion.insertText = 'ui.Div({  }, (ui) => {\n\t$0\n})';
        return [completion];
      }
    },
    '.'
  );

  const hoverProvider = vscode.languages.registerHoverProvider(AUWLA, {
    provideHover(document, position) {
      const range = document.getWordRangeAtPosition(position);
      const word = range ? document.getText(range) : '';
      if (word === 'watch') {
        return new vscode.Hover('watch(refs, () => ...) - reactive watcher');
      }
      return null;
    }
  });

  context.subscriptions.push(completionProvider, hoverProvider);
}

export function deactivate() {}
