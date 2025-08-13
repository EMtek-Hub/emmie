// lib/markdown.ts
import MarkdownIt from 'markdown-it';
import footnote from 'markdown-it-footnote';
import tasklists from 'markdown-it-task-lists';
import container from 'markdown-it-container';

// Configure markdown renderer
export const md = new MarkdownIt({ 
  linkify: true, 
  breaks: true,
  html: true,
  typographer: true
})
  .use(footnote)
  .use(tasklists)
  .use(container, 'info')
  .use(container, 'warning')
  .use(container, 'danger');

/**
 * Render markdown to HTML safely
 */
export function renderMarkdown(markdown: string): string {
  if (!markdown) return '';
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
