import type { HighlighterAdapter } from '../types';
import type { BundledLanguage, BundledTheme, Highlighter } from 'shiki';

export interface ShikiAdapterOptions {
  theme?: BundledTheme | { light: BundledTheme; dark: BundledTheme };
  langs?: BundledLanguage[]; // Pre-load specific languages for speed
}

export function shikiHighlighter(options: ShikiAdapterOptions = {}): HighlighterAdapter {
  let shikiInstance: Highlighter | null = null;
  const theme = options.theme || 'github-dark';

  return async (code: string, language: string) => {
    // 1. Dynamically import Shiki ONLY when this function is actually called
    const { createHighlighter } = await import('shiki');

    // 2. Initialize it as a singleton on the first run
    if (!shikiInstance) {
      shikiInstance = await createHighlighter({
        themes: typeof theme === 'string' ? [theme] : [theme.light, theme.dark],
        langs: options.langs || [language as BundledLanguage, 'javascript', 'typescript', 'bash', 'html', 'css'],
      });
    }

    // 3. Load the language if it hasn't been loaded yet (catch-all for unexpected languages)
    if (!shikiInstance.getLoadedLanguages().includes(language)) {
      await shikiInstance.loadLanguage(language as BundledLanguage).catch(() => {});
    }

    const shikiOptions: any = {
      lang: language,
    };

    if (typeof theme === 'string') {
      shikiOptions.theme = theme;
    } else {
        shikiOptions.themes = theme;
    }

    return shikiInstance.codeToHtml(code, shikiOptions);
  };
}
