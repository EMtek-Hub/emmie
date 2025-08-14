// lib/ai.ts
import OpenAI from 'openai';

if (!process.env.OPENAI_API_KEY) {
  throw new Error('Missing OPENAI_API_KEY environment variable');
}

export const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY! 
});

// Default models and configurations
export const DEFAULT_CHAT_MODEL = 'gpt-5';
export const DEFAULT_EMBEDDING_MODEL = 'text-embedding-3-small';

/**
 * Generate embeddings for text content
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: DEFAULT_EMBEDDING_MODEL,
    input: text,
  });
  
  return response.data[0].embedding;
}

/**
 * Chunk text into smaller pieces for embedding
 */
export function chunkText(text: string, maxTokens: number = 500): string[] {
  // Simple chunking by paragraphs and sentences
  const paragraphs = text.split(/\n\s*\n/);
  const chunks: string[] = [];
  
  for (const paragraph of paragraphs) {
    if (paragraph.length <= maxTokens * 4) { // Rough token estimation
      chunks.push(paragraph.trim());
    } else {
      // Split long paragraphs by sentences
      const sentences = paragraph.split(/[.!?]+/);
      let currentChunk = '';
      
      for (const sentence of sentences) {
        if ((currentChunk + sentence).length <= maxTokens * 4) {
          currentChunk += sentence + '. ';
        } else {
          if (currentChunk) chunks.push(currentChunk.trim());
          currentChunk = sentence + '. ';
        }
      }
      
      if (currentChunk) chunks.push(currentChunk.trim());
    }
  }
  
  return chunks.filter(chunk => chunk.length > 0);
}
