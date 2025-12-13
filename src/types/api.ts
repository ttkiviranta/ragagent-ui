// API vastausten tyypit
export interface Message {
  id?: string
  conversationId?: string
  role: 'user' | 'assistant'
  content: string
  timestamp?: string
  sources?: Source[]
}

export interface Source {
  url: string
  content: string
  relevanceScore: number
}

export interface Conversation {
  id: string
  title?: string
  createdAt: string
  lastMessageAt: string
}

export interface ConversationDto {
  id: string
  title: string
  createdAt: string
  lastMessageAt: string
  messageCount: number
}

export interface QueryRequest {
  query: string
  topK?: number
}

export interface QueryResponse {
  query: string
  answer: string
  sources: Source[]
  source_count: number
  processing_time_ms: number
}
