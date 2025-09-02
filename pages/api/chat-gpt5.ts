import { requireApiPermission } from '../../lib/apiAuth';
import { supabaseAdmin, EMTEK_ORG_ID, ensureUser } from '../../lib/db';
import { openai, detectImageGenerationRequest } from '../../lib/ai';
import { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';

export const config = { 
  api: { 
    bodyParser: { sizeLimit: '1mb' } 
  } 
};

// Define tools for GPT-5 Responses API format
const tools = [
  {
    type: 'function' as const,
    name: 'supabase_search',
    description: 'Search company knowledge in Supabase (pgvector + FTS hybrid search) and return top relevant passages.',
    parameters: {
      type: 'object' as const,
      properties: {
        query: { 
          type: 'string' as const,
          description: 'Search query to find relevant information'
        },
        k: { 
          type: 'integer' as const, 
          default: 5,
          description: 'Number of results to return'
        },
        agent_id: {
          type: 'string' as const,
          description: 'Optional agent ID to filter documents'
        }
      },
      required: ['query'],
      additionalProperties: false
    },
    strict: false
  },
  {
    type: 'image_generation' as const
  }
];

// Tool handler: embed query -> hybrid search -> return results
async function supabaseSearch({ 
  query, 
  k = 5, 
  agent_id = null 
}: { 
  query: string; 
  k?: number; 
  agent_id?: string | null;
}) {
  try {
    console.log('🔍 Performing Supabase search:', { query, k, agent_id });
    
    // 1. Generate embedding for the query
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: query
    });
    const queryEmbedding = embeddingResponse.data[0].embedding;
    
    console.log('✅ Generated embedding for query');

    // 2. Perform hybrid search in Supabase
    const { data, error } = await supabaseAdmin.rpc('hybrid_search', {
      query_text: query,
      query_embedding: queryEmbedding,
      match_count: k,
      agent_id_param: agent_id ? agent_id : null,
      similarity_threshold: 0.5, // Lower threshold for more results
      rrf_k: 50
    });

    if (error) {
      console.error('❌ Supabase search error:', error);
      throw error;
    }

    console.log('✅ Found', data?.length || 0, 'results');

    // 3. Return formatted results
    return data?.map((result: any) => ({
      chunk_id: result.chunk_id,
      document_id: result.document_id,
      score: result.combined_score,
      content: result.content,
      metadata: result.metadata,
      chunk_index: result.chunk_index
    })) || [];

  } catch (error) {
    console.error('❌ Error in supabaseSearch:', error);
    throw new Error(`Search failed: ${error.message}`);
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await requireApiPermission(req, res, process.env.TOOL_SLUG!);
  if (!session) return;

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { chatId, messages, agentId, selectedContext } = req.body;
  const userId = session.user.id;
  const email = session.user.email;
  const displayName = session.user.name;

  console.log('🚀 Starting GPT-5 chat request with streaming', { 
    chatId, 
    messagesCount: messages?.length, 
    agentId,
    hasSelectedContext: !!selectedContext?.length
  });

  try {
    // Ensure user exists
    await ensureUser(userId, email, displayName);

    // Load agent information if specified
    let agent = null;
    if (agentId) {
      try {
        const { data: agentData, error: agentError } = await supabaseAdmin
          .from('chat_agents')
          .select('*')
          .eq('id', agentId)
          .eq('org_id', EMTEK_ORG_ID)
          .eq('is_active', true)
          .single();

        if (agentData && !agentError) {
          agent = agentData;
          console.log('✅ Loaded agent:', agent.name);
        }
      } catch (e) {
        console.log('⚠️ Could not load agent, using default');
      }
    }

    // Ensure chat exists
    let chat_id = chatId;
    if (!chat_id || chat_id.startsWith('temp-')) {
      console.log('🆕 Creating new chat');
      const { data: chat, error } = await supabaseAdmin
        .from('chats')
        .insert([{
          org_id: EMTEK_ORG_ID,
          agent_id: agentId || null,
          title: null,
          created_by: userId
        }])
        .select()
        .single();

      if (error) {
        console.error('❌ Chat creation error:', error);
        return res.status(500).json({ error: 'Failed to create chat' });
      }
      chat_id = chat.id;
      console.log('✅ Created new chat:', chat_id);
    }

    // Get and save user message
    const validMessages = messages.filter(m => m.content && m.content.trim());
    const lastUserMessage = validMessages.reverse().find(m => m.role === 'user');
    const userContent = lastUserMessage?.content || '';
    
    if (!userContent.trim()) {
      return res.status(400).json({ error: 'Message content is required' });
    }

    const { data: userMsg, error: umErr } = await supabaseAdmin
      .from('messages')
      .insert([{
        chat_id,
        role: 'user',
        content_md: userContent,
        model: 'user'
      }])
      .select()
      .single();

    if (umErr) {
      console.error('❌ User message error:', umErr);
      return res.status(500).json({ error: 'Failed to save user message' });
    }

    // Setup SSE
    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    });

    const send = (data: any) => {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    try {
      // Build system prompt
      const systemPrompt = agent?.system_prompt || 
        `You are Emmie, EMtek's helpful AI assistant with access to company knowledge through document search.

Key characteristics:
- Helpful and professional
- Use Australian English spelling and terminology
- When users ask questions that might benefit from document search, use the supabase_search tool
- Cite your sources when using information from documents
- Provide clear, structured responses
- Ask clarifying questions when needed

You have access to a document search tool that can find relevant information from uploaded documents and company knowledge. Use it when users ask questions that might be answered by existing documentation.`;

      // Build conversation messages for Chat Completions API
      const chatMessages: any[] = [
        { role: 'system', content: systemPrompt }
      ];
      
      // Add recent conversation history
      const recentMessages = messages.slice(-10);
      for (const msg of recentMessages) {
        if (msg.role === 'user' || msg.role === 'assistant') {
          chatMessages.push({
            role: msg.role as 'user' | 'assistant',
            content: msg.content
          });
        }
      }

      // Add context from selected documents if provided
      if (selectedContext && selectedContext.length > 0) {
        const contextContent = selectedContext.map(doc => 
          `Document: ${doc.name}\nContent: ${doc.content || 'No content available'}`
        ).join('\n\n');
        
        chatMessages.push({
          role: 'system',
          content: `Additional context from selected documents:\n\n${contextContent}`
        });
      }

      console.log('🤖 Starting streaming with GPT-5 Responses API...');

      // Build input for GPT-5 Responses API
      const input = chatMessages.slice(1); // Remove system message for input array
      
      // Use GPT-5 Responses API with streaming
      const stream = await openai.responses.create({
        model: 'gpt-5',
        instructions: chatMessages[0]?.content || systemPrompt, // System prompt as instructions
        input: input,
        tools: tools,
        stream: true
      });

      let fullResponse = '';
      let toolCallData = null;
      let hasToolCall = false;
      let imageGenerationData = null;

      // Process the semantic events stream
      for await (const event of stream) {
        console.log('📡 Stream event:', event.type);
        
        if (event.type === 'response.output_text.delta') {
          // Stream text content as it arrives
          fullResponse += event.delta;
          send({ delta: event.delta });
        }
        
        // Handle progressive image generation events
        if ((event as any).type === 'image_generation.partial_image') {
          console.log('🎨 Partial image received');
          hasToolCall = true;
          send({ 
            image_partial: {
              b64_json: (event as any).b64_json,
              partial_image_index: (event as any).partial_image_index,
              size: (event as any).size,
              quality: (event as any).quality,
              output_format: (event as any).output_format
            }
          });
        }
        
        if ((event as any).type === 'image_generation.completed') {
          console.log('🎨 Image generation completed:', {
            size: (event as any).size,
            quality: (event as any).quality,
            format: (event as any).output_format,
            hasB64Json: !!((event as any).b64_json)
          });
          imageGenerationData = event;
          
          try {
            console.log('📁 Processing image data...');
            // Save the completed image to storage
            const imageBuffer = Buffer.from((event as any).b64_json, 'base64');
            const format = (event as any).output_format || 'png';
            const contentType = format === 'jpeg' ? 'image/jpeg' : format === 'webp' ? 'image/webp' : 'image/png';
            const extension = format === 'jpeg' ? 'jpg' : format;
            
            console.log('🔧 Image details:', {
              bufferSize: imageBuffer.length,
              format: format,
              contentType: contentType,
              extension: extension
            });
            
            // Generate unique filename
            const uniqueFilename = `generated-${crypto.randomUUID()}.${extension}`;
            const storagePath = `generated-images/${uniqueFilename}`;
            console.log('📂 Storage path:', storagePath);

            // Upload to Supabase Storage
            console.log('⬆️ Uploading to Supabase storage...');
            const { error: uploadError } = await supabaseAdmin.storage
              .from('media')
              .upload(storagePath, imageBuffer, {
                contentType: contentType,
                upsert: false
              });

            if (uploadError) {
              console.error('❌ Supabase storage error:', uploadError);
              send({ error: 'Failed to save generated image' });
              break;
            }
            console.log('✅ Image uploaded successfully');

            // Create signed URL
            console.log('🔗 Creating signed URL...');
            const { data: signedUrlData, error: signedUrlError } = await supabaseAdmin.storage
              .from('media')
              .createSignedUrl(storagePath, 24 * 60 * 60);

            if (signedUrlError || !signedUrlData) {
              console.error('❌ Signed URL error:', signedUrlError);
              send({ error: 'Failed to create signed URL' });
              break;
            }
            console.log('✅ Signed URL created:', signedUrlData.signedUrl);

            // Send completed image information
            console.log('📡 Sending image_completed event...');
            send({ 
              image_completed: {
                url: signedUrlData.signedUrl,
                size: (event as any).size,
                quality: (event as any).quality,
                format: (event as any).output_format,
                fileSize: imageBuffer.length,
                usage: (event as any).usage,
                storagePath: storagePath
              }
            });

            // Update full response to include image reference
            const imageMarkdown = `![Generated image](${signedUrlData.signedUrl})`;
            fullResponse += `\n\n${imageMarkdown}`;
            console.log('✅ Added image markdown to response. Full response length:', fullResponse.length);

            // Save assistant message with multimodal content
            console.log('💾 Saving assistant message to database...');
            try {
              const { data: assistantMsg, error: saveError } = await supabaseAdmin
                .from('messages')
                .insert([{
                  chat_id,
                  role: 'assistant',
                  content_md: fullResponse,
                  model: 'gpt-5',
                  message_type: 'multimodal',
                  attachments: [{
                    type: 'image',
                    url: signedUrlData.signedUrl,
                    alt: 'AI-generated image',
                    storage_path: storagePath,
                    file_size: imageBuffer.length,
                    format: format,
                    size: (event as any).size,
                    quality: (event as any).quality
                  }]
                }])
                .select()
                .single();

              if (saveError) {
                console.error('❌ Database save error:', saveError);
                send({ error: 'Failed to save message to database' });
              } else {
                console.log('✅ Assistant message saved successfully. Message ID:', assistantMsg?.id);
                
                // Send completion event
                console.log('📡 Sending completion event...');
                send({ 
                  done: true, 
                  chatId: chat_id, 
                  messageId: assistantMsg?.id,
                  imageGenerated: true
                });
              }
            } catch (dbError) {
              console.error('❌ Database error:', dbError);
              send({ error: 'Database operation failed: ' + dbError.message });
            }

          } catch (imageError) {
            console.error('❌ Image processing error:', imageError);
            send({ error: 'Failed to process generated image: ' + imageError.message });
          }
        }
        
        if (event.type === 'response.function_call_arguments.delta') {
          // Handle tool call arguments streaming
          if (!toolCallData) {
            toolCallData = { name: 'supabase_search', arguments: '' };
            hasToolCall = true;
          }
          toolCallData.arguments += event.delta;
        }
        
        if (event.type === 'response.function_call_arguments.done') {
          // Tool call is complete, execute it
          if (toolCallData && toolCallData.name === 'supabase_search') {
            try {
              const toolArgs = JSON.parse(toolCallData.arguments) as { query: string; k?: number };
              console.log('🔧 Tool call detected:', toolArgs);
              
              send({ tool_call: { name: 'supabase_search', args: toolArgs } });

              // Execute the search
              const searchResults = await supabaseSearch({
                ...toolArgs,
                agent_id: agentId
              });

              console.log('📚 Search completed, found', searchResults.length, 'results');
              send({ tool_result: { results: searchResults } });

              // Continue conversation with tool results using Responses API
              const toolResultContent = `Search Results:\n${JSON.stringify(searchResults, null, 2)}\n\nBased on these search results, please provide a comprehensive answer to the user's question.`;
              
              const followUpInput = [
                ...input,
                {
                  role: 'assistant',
                  content: fullResponse
                },
                {
                  role: 'user',
                  content: `[Tool result for query "${toolArgs.query}"]\n\n${toolResultContent}`
                }
              ];

              // Get follow-up response with tool results
              const followUpStream = await openai.responses.create({
                model: 'gpt-5',
                instructions: systemPrompt,
                input: followUpInput,
                stream: true
              });

              let followUpResponse = '';
              for await (const followUpEvent of followUpStream) {
                if (followUpEvent.type === 'response.output_text.delta') {
                  followUpResponse += followUpEvent.delta;
                  send({ delta: followUpEvent.delta });
                }
                
                if (followUpEvent.type === 'response.completed') {
                  console.log('📡 Follow-up streaming completed');
                  break;
                }
              }

              fullResponse += followUpResponse;

              // Save assistant message with tool call metadata
              const { data: assistantMsg } = await supabaseAdmin
                .from('messages')
                .insert([{
                  chat_id,
                  role: 'assistant',
                  content_md: fullResponse,
                  model: 'gpt-5',
                  metadata: {
                    tool_calls: [{
                      name: 'supabase_search',
                      arguments: toolArgs,
                      results_count: searchResults.length
                    }]
                  }
                }])
                .select()
                .single();

              send({ 
                done: true, 
                chatId: chat_id, 
                messageId: assistantMsg?.id,
                documents: searchResults.map(r => ({
                  document_id: r.document_id,
                  chunk_id: r.chunk_id,
                  score: r.score
                }))
              });

            } catch (toolError) {
              console.error('❌ Tool execution error:', toolError);
              send({ error: 'Tool execution failed: ' + toolError.message });
            }
          }
        }
        
        if (event.type === 'response.completed' && !hasToolCall) {
          // Regular completion without tools
          console.log('📡 Streaming completed');
          
          // Save assistant message
          const { data: assistantMsg } = await supabaseAdmin
            .from('messages')
            .insert([{
              chat_id,
              role: 'assistant',
              content_md: fullResponse,
              model: 'gpt-5'
            }])
            .select()
            .single();

          send({ done: true, chatId: chat_id, messageId: assistantMsg?.id });
          break;
        }
        
        if (event.type === 'error') {
          console.error('❌ Stream error:', event);
          send({ error: 'Streaming error occurred' });
          break;
        }
      }

    } catch (streamError) {
      console.error('❌ Streaming error:', streamError);
      send({ error: 'Failed to generate response: ' + streamError.message });
    }

    res.end();

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return res.status(500).json({ error: 'Internal server error: ' + error.message });
  }
}
