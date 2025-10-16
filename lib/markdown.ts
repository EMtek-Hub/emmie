// lib/markdown.ts
import MarkdownIt from 'markdown-it';
import footnote from 'markdown-it-footnote';
import tasklists from 'markdown-it-task-lists';
import container from 'markdown-it-container';
import hljs from 'highlight.js';

// Configure markdown renderer with syntax highlighting
export const md = new MarkdownIt({ 
  linkify: true, 
  breaks: true,
  html: true,
  typographer: true,
  highlight: function (str, lang) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        const highlighted = hljs.highlight(str, { language: lang, ignoreIllegals: true }).value;
        return `<pre class="hljs-code-block"><div class="code-block-header"><span class="code-block-language">${lang}</span><button class="copy-code-button" data-code="${encodeURIComponent(str)}" title="Copy code"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg></button></div><code class="hljs language-${lang}">${highlighted}</code></pre>`;
      } catch (__) {}
    }
    // No language specified or language not found
    return `<pre class="hljs-code-block"><div class="code-block-header"><button class="copy-code-button" data-code="${encodeURIComponent(str)}" title="Copy code"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg></button></div><code class="hljs">${md.utils.escapeHtml(str)}</code></pre>`;
  }
})
  .use(footnote)
  .use(tasklists)
  .use(container, 'info')
  .use(container, 'warning')
  .use(container, 'danger');

// Make images clickable by wrapping them in links that open in new tabs
const defaultImageRenderer = md.renderer.rules.image;
md.renderer.rules.image = (tokens, idx, options, env, self) => {
  const token = tokens[idx];
  const src = token.attrGet('src');
  const alt = token.content;
  
  if (src) {
    // Create a clickable image that opens in new tab
    return `<img src="${src}" alt="${alt}" style="max-width: 24rem; border-radius: 0.5rem; box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1); cursor: pointer; border: 1px solid #e5e7eb; transition: box-shadow 0.2s;" onclick="window.open('${src}', '_blank', 'noopener,noreferrer')" title="Click to open in new tab" />`;
  }
  
  // Fall back to default renderer
  return defaultImageRenderer ? defaultImageRenderer(tokens, idx, options, env, self) : '';
};

/**
 * Render markdown to HTML safely
 */
export function renderMarkdown(markdown: string, excludeImages: boolean = false): string {
  if (!markdown) return '';
  
  // If excluding images, strip image markdown syntax before rendering
  if (excludeImages) {
    const markdownWithoutImages = markdown.replace(/!\[([^\]]*)\]\([^)]+\)/g, '');
    return md.render(markdownWithoutImages);
  }
  
  return md.render(markdown);
}

/**
 * Strip markdown formatting for plain text
 */
export function stripMarkdown(markdown: string): string {
  if (!markdown) return '';
  // Simple markdown stripping - removes common formatting
  return markdown
    .replace(/#{1,6}\s+/g, '') // Headers
    .replace(/\*\*(.*?)\*\*/g, '$1') // Bold
    .replace(/\*(.*?)\*/g, '$1') // Italic
    .replace(/`(.*?)`/g, '$1') // Inline code
    .replace(/```[\s\S]*?```/g, '') // Code blocks
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Links
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1') // Images
    .replace(/^\s*[-*+]\s+/gm, '') // List items
    .replace(/^\s*\d+\.\s+/gm, '') // Numbered lists
    .replace(/^\s*>\s+/gm, '') // Blockquotes
    .trim();
}

/**
 * Extract a summary from markdown content
 */
export function extractSummary(markdown: string, maxLength: number = 200): string {
  const plainText = stripMarkdown(markdown);
  if (plainText.length <= maxLength) return plainText;
  
  // Try to break at sentence boundary
  const sentences = plainText.split(/[.!?]+/);
  let summary = '';
  
  for (const sentence of sentences) {
    if ((summary + sentence).length > maxLength) break;
    summary += sentence + '. ';
  }
  
  return summary.trim() || plainText.substring(0, maxLength).trim() + '...';
}
