import { apiClient } from '@/services/apiClient'

export function useApi() {
  return {
    query: apiClient.query.bind(apiClient),
    getConversations: apiClient.getConversations.bind(apiClient),
    getConversationHistory: apiClient.getConversationHistory.bind(apiClient),
    createConversation: apiClient.createConversation.bind(apiClient),
    ingestDocument: apiClient.ingestDocument.bind(apiClient),
    getAgentStats: apiClient.getAgentStats.bind(apiClient),
    healthCheck: apiClient.healthCheck.bind(apiClient),
  }
}
