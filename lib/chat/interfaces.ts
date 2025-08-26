// Chat interfaces for advanced message handling
export interface Message {
  id: number;
  role: 'user' | 'assistant' | 'system' | 'error';
  content: string;
  timestamp: Date;
  messageId: number;
  parentMessageId: number | null;
  childrenMessageIds?: number[];
  latestChildMessageId?: number | null;
  files?: FileDescriptor[];
  toolCall?: ToolCallMetadata | null;
  citations?: Record<string, any>;
  query?: string;
  documents?: Document[];
  alternateAssistantId?: number | null;
  overriddenModel?: string;
  stopReason?: StreamStopReason | null;
  stackTrace?: string | null;
  subQuestions?: SubQuestionDetail[];
  isGenerating?: boolean;
  secondLevelGenerating?: boolean;
  agenticDocs?: Document[] | null;
  isAgentic?: boolean;
  attachments?: Attachment[];
}

export interface FileDescriptor {
  id: string;
  type: ChatFileType;
  name?: string;
  url?: string;
  isUploading?: boolean;
}

export enum ChatFileType {
  IMAGE = 'image',
  PLAIN_TEXT = 'text',
  CSV = 'csv',
  PDF = 'pdf',
  DOCX = 'docx',
  USER_KNOWLEDGE = 'user_knowledge'
}

export interface ToolCallMetadata {
  tool_name: string;
  tool_args: Record<string, any>;
  tool_result?: any;
}

export interface Document {
  document_id: string;
  semantic_identifier: string;
  link?: string;
  source_type?: string;
  title?: string;
  content?: string;
  score?: number;
  chunk_ind?: number;
  db_doc_id?: number;
}

export interface SubQuestionDetail {
  sub_question: string;
  answer: string;
  documents?: Document[];
  level: number;
  is_generating?: boolean;
  is_stopped?: boolean;
}

export enum StreamStopReason {
  CONTEXT_LENGTH = 'context_length',
  COMPLETE = 'complete',
  ERROR = 'error'
}

export interface Attachment {
  type: 'image' | 'file';
  url: string;
  alt?: string;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
  agentId?: number;
  sharedStatus?: ChatSessionSharedStatus;
}

export enum ChatSessionSharedStatus {
  Private = 'private',
  Public = 'public'
}

export interface MessageResponseIDInfo {
  user_message_id: number;
  reserved_assistant_message_id: number;
}

export interface StreamingError {
  error: string;
  stack_trace?: string;
}

export interface ChatState {
  state: 'input' | 'loading' | 'streaming' | 'toolBuilding' | 'uploading' | 'error';
  error?: string;
}

export interface RegenerationState {
  regenerating: boolean;
  finalMessageIndex: number;
}

export type PacketType = 
  | MessageResponseIDInfo 
  | StreamingError 
  | { delta: string }
  | { chatId: string; messageId: number }
  | { tool_name: string; tool_args: any; tool_result?: any }
  | { top_documents: Document[] }
  | { sub_question: string }
  | { answer_piece: string }
  | { error: string; stack_trace?: string }
  | { stop_reason: StreamStopReason };
