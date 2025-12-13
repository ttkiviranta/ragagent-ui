import axios, { type AxiosInstance } from 'axios'
import type { QueryRequest, QueryResponse, ConversationDto, Message } from '@/types/api'

class ApiClient {
  private client: AxiosInstance

  constructor() {
    // Luo axios instance API base URL:lla
    this.client = axios.create({
      baseURL: 'https://localhost:7000',
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000, // 30 sekuntia
    })
  }

  // RAG Query - Lähettää kysymyksen ja saa vastauksen
  async query(request: QueryRequest): Promise<QueryResponse> {
    const response = await this.client.post<QueryResponse>('/api/rag/query', request)
    return response.data
  }

  // Hakee kaikki keskustelut
  async getConversations(): Promise<ConversationDto[]> {
    const response = await this.client.get<ConversationDto[]>('/api/conversations')
    return response.data
  }

  // Hakee yhden keskustelun viestit
  async getConversationHistory(id: string): Promise<Message[]> {
    const response = await this.client.get<Message[]>(`/api/conversations/${id}`)
    return response.data
  }

  // Luo uuden keskustelun
  async createConversation(title?: string): Promise<ConversationDto> {
    const response = await this.client.post<ConversationDto>('/api/conversations', {
      title,
    })
    return response.data
  }

  // Document ingestion
  async ingestDocument(url: string, chunkSize = 1000, chunkOverlap = 200) {
    const response = await this.client.post('/api/rag/ingest-enhanced', {
      url,
      chunkSize,
      chunkOverlap,
    })
    return response.data
  }

  // Agent analytics
  async getAgentStats(days = 7) {
    const response = await this.client.get(`/api/analytics/agents?days=${days}`)
    return response.data
  }

  // Health check
  async healthCheck() {
    const response = await this.client.get('/api/rag/health')
    return response.data
  }
}

// Exportataan singleton instance
export const apiClient = new ApiClient()
