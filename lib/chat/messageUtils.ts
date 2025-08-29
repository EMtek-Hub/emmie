import { Message, ChatSession, Document } from './interfaces';

// Build the latest message chain from the message map
export function buildLatestMessageChain(messageMap: Map<number, Message>): Message[] {
  if (messageMap.size === 0) return [];
  
  const messageChain: Message[] = [];
  let currentMessage: Message | undefined;
  
  // Find the root message (system message or first message)
  const rootMessage = Array.from(messageMap.values()).find(
    msg => msg.parentMessageId === null || msg.parentMessageId === -3
  );
  
  if (!rootMessage) return [];
  
  currentMessage = rootMessage;
  
  // Follow the chain of latest child messages
  while (currentMessage) {
    if (currentMessage.role !== 'system') {
      messageChain.push(currentMessage);
    }
    
    if (currentMessage.latestChildMessageId) {
      currentMessage = messageMap.get(currentMessage.latestChildMessageId);
    } else {
      break;
    }
  }
  
  return messageChain;
}

// Process raw chat history into a message map
export function processRawChatHistory(messages: any[]): Map<number, Message> {
  const messageMap = new Map<number, Message>();
  
  if (messages.length === 0) return messageMap;
  
  // Sort messages by creation time to ensure proper order
  const sortedMessages = messages.sort((a, b) => {
    const timeA = new Date(a.timestamp || a.created_at).getTime();
    const timeB = new Date(b.timestamp || b.created_at).getTime();
    return timeA - timeB;
  });
  
  // Process messages into a simple sequential chain
  sortedMessages.forEach((msg, index) => {
    const processedMsg: Message = {
      ...msg,
      timestamp: new Date(msg.timestamp || msg.created_at),
      messageId: msg.messageId || msg.id,
      childrenMessageIds: [],
      latestChildMessageId: null,
      content: msg.content || msg.content_md,
      // Set up simple parent-child chain
      parentMessageId: index === 0 ? -3 : (sortedMessages[index - 1].messageId || sortedMessages[index - 1].id)
    };
    
    messageMap.set(processedMsg.messageId, processedMsg);
  });
  
  // Build parent-child relationships for the sequential chain
  messageMap.forEach(msg => {
    if (msg.parentMessageId && msg.parentMessageId !== -3) {
      const parent = messageMap.get(msg.parentMessageId);
      if (parent) {
        if (!parent.childrenMessageIds) {
          parent.childrenMessageIds = [];
        }
        if (!parent.childrenMessageIds.includes(msg.messageId)) {
          parent.childrenMessageIds.push(msg.messageId);
        }
        parent.latestChildMessageId = msg.messageId;
      }
    }
  });
  
  return messageMap;
}

// Update parent-child relationships
export function updateParentChildren(
  message: Message,
  messageMap: Map<number, Message>,
  addToParent: boolean = true
) {
  if (!message.parentMessageId) return;
  
  const parent = messageMap.get(message.parentMessageId);
  if (!parent) return;
  
  if (!parent.childrenMessageIds) {
    parent.childrenMessageIds = [];
  }
  
  if (addToParent && !parent.childrenMessageIds.includes(message.messageId)) {
    parent.childrenMessageIds.push(message.messageId);
    parent.latestChildMessageId = message.messageId;
  }
}

// Remove a message from the map and update relationships
export function removeMessage(
  messageId: number,
  messageMap: Map<number, Message>
) {
  const message = messageMap.get(messageId);
  if (!message) return;
  
  // Update parent's children list
  if (message.parentMessageId) {
    const parent = messageMap.get(message.parentMessageId);
    if (parent && parent.childrenMessageIds) {
      parent.childrenMessageIds = parent.childrenMessageIds.filter(
        id => id !== messageId
      );
      if (parent.latestChildMessageId === messageId) {
        parent.latestChildMessageId = parent.childrenMessageIds.length > 0
          ? parent.childrenMessageIds[parent.childrenMessageIds.length - 1]
          : null;
      }
    }
  }
  
  // Remove the message
  messageMap.delete(messageId);
}

// Get human and AI message pair from a message number
export function getHumanAndAIMessageFromMessageNumber(
  messageHistory: Message[],
  messageNumber: number
): { humanMessage: Message | null; aiMessage: Message | null } {
  const aiMessage = messageHistory.find(msg => msg.messageId === messageNumber);
  if (!aiMessage) return { humanMessage: null, aiMessage: null };
  
  const humanMessageIndex = messageHistory.findIndex(msg => msg.messageId === messageNumber) - 1;
  const humanMessage = humanMessageIndex >= 0 ? messageHistory[humanMessageIndex] : null;
  
  return { humanMessage, aiMessage };
}

// Get last successful message ID
export function getLastSuccessfulMessageId(messages: Message[]): number | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role !== 'error') {
      return messages[i].messageId;
    }
  }
  return null;
}

// Get cited documents from a message
export function getCitedDocumentsFromMessage(
  message: Message
): [string, Document][] | null {
  if (!message.citations || !message.documents) return null;
  
  const citedDocs: [string, Document][] = [];
  Object.entries(message.citations).forEach(([key, docIds]) => {
    if (Array.isArray(docIds)) {
      docIds.forEach(docId => {
        const doc = message.documents?.find(d => d.document_id === docId);
        if (doc) {
          citedDocs.push([key, doc]);
        }
      });
    }
  });
  
  return citedDocs.length > 0 ? citedDocs : null;
}

// Create a new chat session
export async function createChatSession(
  agentId: number,
  title?: string | null
): Promise<string> {
  try {
    const response = await fetch('/api/chats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agentId: agentId || 0,
        title: title || null,
        // Add a flag to indicate this is a proper chat session
        hasContent: true
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to create chat session:', response.status, errorText);
      // Throw error instead of returning temp ID to let caller handle it
      throw new Error(`Chat creation failed: ${response.status}`);
    }
    
    const data = await response.json();
    const chatId = data.chat?.id || data.chatId || data.id;
    
    if (!chatId) {
      throw new Error('No chat ID returned from server');
    }
    
    console.log('Chat session created successfully:', chatId);
    return chatId;
  } catch (error) {
    console.error('Error creating chat session:', error);
    // Re-throw error to let caller handle it properly
    throw error;
  }
}

// Name a chat session
export async function nameChatSession(chatSessionId: string): Promise<void> {
  try {
    const response = await fetch(`/api/chats/${chatSessionId}/generate-title`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to generate title: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Title generated successfully:', data.title);
  } catch (error) {
    console.error('Error generating chat title:', error);
    throw error; // Re-throw so the caller can handle it
  }
}

// Set message as latest in the chain
export async function setMessageAsLatest(messageId: number): Promise<void> {
  // This would typically update the database
  // For now, it's a placeholder
  console.log('Setting message as latest:', messageId);
}

// Handle chat feedback
export async function handleChatFeedback(
  messageId: number,
  feedbackType: 'like' | 'dislike',
  feedbackDetails: string,
  predefinedFeedback?: string
): Promise<Response> {
  return fetch('/api/feedback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messageId,
      feedbackType,
      feedbackDetails,
      predefinedFeedback
    })
  });
}

// Update LLM override for chat session
export async function updateLlmOverrideForChatSession(
  chatSessionId: string,
  llmOverride: string
): Promise<void> {
  await fetch(`/api/chats/${chatSessionId}/llm`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ llmOverride })
  });
}
