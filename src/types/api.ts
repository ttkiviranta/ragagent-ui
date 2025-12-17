// API vastausten tyypit

// Message types
export interface Message {
  id?: string
  conversationId?: string
  role: 'user' | 'assistant'
  content: string
  timestamp?: string
  createdAt?: string
  sources?: Source[] | null
}

export interface MessageDto {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: string
  sources: SourceDto[] | null
}

export interface Source {
  url: string
  content: string
  relevanceScore: number
}

export interface SourceDto {
  url: string
  content: string
  relevanceScore: number
}

// Conversation types
export interface Conversation {
  id: string
  title?: string
  createdAt: string
  lastMessageAt: string
}

export interface ConversationDto {
  id: string
  title: string | null
  createdAt: string
  lastMessageAt: string
  messageCount: number
}

export interface CreateConversationRequest {
  title?: string
}

export interface CreateConversationResponse {
  id: string
  title: string
  createdAt: string
}

// Query types
export interface QueryRequest {
  query: string
  topK?: number
  conversationId?: string
}

export interface QueryResponse {
  query: string
  answer: string
  sources: Source[]
  source_count: number
  processing_time_ms: number
}
