import axios, { type AxiosInstance } from 'axios'
import type {
  ConversationDto,
  MessageDto,
  CreateConversationRequest,
  CreateConversationResponse,
} from '@/types/api'

class ConversationApiService {
  private client: AxiosInstance

  constructor() {
    this.client = axios.create({
      baseURL: 'https://localhost:7000',
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    })
  }

  // Get all conversations
  async getAll(): Promise<ConversationDto[]> {
    const response = await this.client.get<ConversationDto[]>('/api/conversations')
    return response.data
  }

  // Get conversation history (messages)
  async getHistory(id: string): Promise<MessageDto[]> {
    const response = await this.client.get<MessageDto[]>(`/api/conversations/${id}`)
    return response.data
  }

  // Create new conversation
  async create(request?: CreateConversationRequest): Promise<CreateConversationResponse> {
    const response = await this.client.post<CreateConversationResponse>(
      '/api/conversations',
      request || {},
    )
    return response.data
  }

  // Delete conversation (if API supports it)
  async delete(id: string): Promise<void> {
    await this.client.delete(`/api/conversations/${id}`)
  }

  // Update conversation title (if API supports it)
  async updateTitle(id: string, title: string): Promise<void> {
    await this.client.patch(`/api/conversations/${id}`, { title })
  }
}

// Export singleton instance
export const conversationApi = new ConversationApiService()
