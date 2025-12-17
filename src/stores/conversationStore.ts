import { defineStore } from 'pinia'
import { conversationApi } from '@/services/conversationApi'
import type { ConversationDto, MessageDto } from '@/types/api'

interface ConversationState {
  conversations: ConversationDto[]
  currentConversationId: string | null
  messages: MessageDto[]
  isLoading: boolean
  error: string | null
}

export const useConversationStore = defineStore('conversation', {
  state: (): ConversationState => ({
    conversations: [],
    currentConversationId: null,
    messages: [],
    isLoading: false,
    error: null,
  }),

  getters: {
    // Get currently selected conversation
    currentConversation: (state): ConversationDto | undefined => {
      return state.conversations.find((c) => c.id === state.currentConversationId)
    },

    // Get conversations sorted by last message time (newest first)
    sortedConversations: (state): ConversationDto[] => {
      return [...state.conversations].sort((a, b) => {
        return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
      })
    },

    // Check if a conversation is currently selected
    hasActiveConversation: (state): boolean => {
      return state.currentConversationId !== null
    },
  },

  actions: {
    // Fetch all conversations from API
    async fetchConversations() {
      this.isLoading = true
      this.error = null

      try {
        this.conversations = await conversationApi.getAll()
      } catch (err) {
        this.error = 'Failed to load conversations'
        console.error('[ConversationStore] Failed to fetch conversations:', err)
        throw err
      } finally {
        this.isLoading = false
      }
    },

    // Load a specific conversation's history
    async loadConversation(id: string) {
      this.currentConversationId = id
      this.isLoading = true
      this.error = null

      try {
        this.messages = await conversationApi.getHistory(id)
      } catch (err) {
        this.error = 'Failed to load conversation history'
        console.error('[ConversationStore] Failed to load conversation:', id, err)
        throw err
      } finally {
        this.isLoading = false
      }
    },

    // Create a new conversation
    async createConversation(title?: string) {
      this.error = null

      try {
        const newConv = await conversationApi.create(title ? { title } : undefined)

        // Refresh conversation list
        await this.fetchConversations()

        // Load the new conversation
        await this.loadConversation(newConv.id)

        return newConv
      } catch (err) {
        this.error = 'Failed to create conversation'
        console.error('[ConversationStore] Failed to create conversation:', err)
        throw err
      }
    },

    // Refresh the current conversation (to get updated message count)
    async refreshCurrentConversation() {
      if (!this.currentConversationId) return

      try {
        await this.fetchConversations()
        await this.loadConversation(this.currentConversationId)
      } catch (err) {
        console.error('[ConversationStore] Failed to refresh conversation:', err)
      }
    },

    // Clear current conversation selection
    clearCurrentConversation() {
      this.currentConversationId = null
      this.messages = []
    },

    // Delete a conversation
    async deleteConversation(id: string) {
      try {
        await conversationApi.delete(id)

        // Remove from local state
        this.conversations = this.conversations.filter((c) => c.id !== id)

        // If deleted conversation was active, clear it
        if (this.currentConversationId === id) {
          this.clearCurrentConversation()
        }
      } catch (err) {
        this.error = 'Failed to delete conversation'
        console.error('[ConversationStore] Failed to delete conversation:', id, err)
        throw err
      }
    },

    // Update conversation title
    async updateConversationTitle(id: string, title: string) {
      try {
        await conversationApi.updateTitle(id, title)

        // Update local state
        const conv = this.conversations.find((c) => c.id === id)
        if (conv) {
          conv.title = title
        }
      } catch (err) {
        this.error = 'Failed to update conversation title'
        console.error('[ConversationStore] Failed to update title:', id, err)
        throw err
      }
    },

    // Add a message to current conversation (optimistic update)
    addMessageToCurrentConversation(message: MessageDto) {
      if (this.currentConversationId) {
        this.messages.push(message)
      }
    },
  },
})
