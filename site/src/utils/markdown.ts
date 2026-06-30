import { createMDConfig } from 'auwla-markdown';

let cachedHighlight: any = null;

const highlighter = async (code: string, lang: string) => {
  if (!cachedHighlight) {
    const { shikiHighlighter } = await import('auwla-markdown');
    cachedHighlight = shikiHighlighter({
      theme: 'github-dark',
      langs: ['typescript', 'tsx', 'javascript', 'jsx', 'bash', 'html', 'css', 'json']
    });
  }
  return cachedHighlight(code, lang);
};

export const mdParser = createMDConfig({
  highlighter,
  features: {
    copyCodeButton: true,
    headerAnchors: true
  }
});
