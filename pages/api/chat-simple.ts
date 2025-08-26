import { requireApiPermission } from '../../lib/apiAuth';
import { supabaseAdmin, EMTEK_ORG_ID, ensureUser } from '../../lib/db';
import { openai, selectGPT5Model, selectReasoningEffort } from '../../lib/ai';
import { NextApiRequest, NextApiResponse } from 'next';

export const config = { 
  api: { 
    bodyParser: { sizeLimit: '1mb' } 
  } 
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await requireApiPermission(req, res, process.env.TOOL_SLUG!);
  if (!session) return;

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { chatId, messages, agentId } = req.body;
  const userId = session.user.id;
  const email = session.user.email;
  const displayName = session.user.name;

  console.log('🚀 Starting simplified chat request', { chatId, messagesCount: messages?.length, agentId });
  console.log('📋 Request body details:', { 
    hasMessages: !!messages, 
    messageTypes: messages?.map(m => ({ role: m.role, contentLength: m.content?.length })),
    userId: userId?.substring(0, 8) + '...',
    agentId 
  });

  try {
    // Ensure user exists
    await ensureUser(userId, email, displayName);

    // 1) Load agent information if specified
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

    // 2) Ensure chat exists
    let chat_id = chatId;
    if (!chat_id || chat_id.startsWith('temp-')) {
      console.log('🆕 Creating new chat (temp or no ID provided)');
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
    } else {
      console.log('✅ Using existing chat:', chat_id);
    }

    // 3) Filter and get user message
    console.log('📝 Processing messages...');
    const validMessages = messages.filter(m => m.content && m.content.trim());
    console.log('✅ Valid messages count:', validMessages.length);
    
    const lastUserMessage = validMessages.reverse().find(m => m.role === 'user');
    const userContent = lastUserMessage?.content || '';
    
    console.log('👤 User message:', userContent);
    
    if (!userContent.trim()) {
      console.log('❌ No valid user message found');
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

    console.log('✅ Saved user message:', userMsg.id);

    console.log('🌊 Setting up SSE stream...');
    // 4) Prepare SSE
    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    });

    const send = (data: any) => {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    console.log('✅ SSE stream ready');

    try {
      // 5) Build simple system instructions
      const instructions = agent?.system_prompt || 
        `You are Emmie, EMtek's helpful AI assistant. You are knowledgeable about technology, project management, and general business topics. 

Key characteristics:
- Helpful and professional
- Use Australian English spelling and terminology
- Provide clear, structured responses
- Ask clarifying questions when needed
- Be concise but thorough

Respond in a helpful, professional manner and provide practical advice where appropriate.`;

      // 6) Build conversation input for Responses API
      let conversationInput = '';
      
      // Add conversation history (last 10 messages to keep it manageable)
      const recentMessages = messages.slice(-10);
      for (const msg of recentMessages) {
        if (msg.role === 'user' || msg.role === 'assistant') {
          conversationInput += `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}\n\n`;
        }
      }
      
      // Add the current user message
      conversationInput += `User: ${userContent}\n\nAssistant:`;

      // 7) Select appropriate GPT-5 model and reasoning effort
      const selectedModel = selectGPT5Model({
        messageLength: userContent.length,
        isComplexTask: false // Simple chat, use efficient model
      });
      
      const reasoningEffort = selectReasoningEffort({
        messageLength: userContent.length
      });

      console.log('🤖 Calling OpenAI Responses API with', selectedModel);
      console.log('🔑 OpenAI API Key exists:', !!process.env.OPENAI_API_KEY);
      console.log('💭 Reasoning effort:', reasoningEffort);
      console.log('📄 User message:', userContent.substring(0, 100));

      // 8) Call OpenAI with new Responses API (non-streaming first, then handle response)
      const response = await openai.responses.create({
        model: selectedModel,
        instructions: instructions,
        input: conversationInput,
        reasoning: { effort: reasoningEffort as any } // Cast to avoid type error for now
      });
      
      console.log('🎯 OpenAI response received successfully');

      // 9) Handle the response based on the structure shown in the documentation
      const responseText = response.output_text || '';
      console.log('📡 Sending response...');
      console.log('📝 Response length:', responseText.length);
      
      // Send the complete response (for now, we'll handle streaming later)
      send({ delta: responseText });
      
      let assistantContent = responseText;
      
      console.log('📝 Final assistant content length:', assistantContent.length);

      // 10) Save assistant message
      const { data: assistantMsg, error: amErr } = await supabaseAdmin
        .from('messages')
        .insert([{
          chat_id,
          role: 'assistant',
          content_md: assistantContent,
          model: selectedModel
        }])
        .select()
        .single();

      if (amErr) {
        console.error('❌ Assistant message error:', amErr);
        send({ error: 'Failed to save assistant message' });
      } else {
        console.log('✅ Saved assistant message:', assistantMsg.id);
        send({ done: true, chatId: chat_id, messageId: assistantMsg.id });
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
