<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useChatHub } from '@/composables/useChatHub'
import { useApi } from '@/composables/useApi'
import { useConversationStore } from '@/stores/conversationStore'
import ConversationList from '@/components/conversation/ConversationList.vue'
import MessageList from '@/components/conversation/MessageList.vue'
import type { MessageDto } from '@/types/api'

const { connection, isConnected, connect, disconnect } = useChatHub()
const api = useApi()
const conversationStore = useConversationStore()

// Reactive state
const userMessage = ref('')
const streamingMessage = ref('')
const isStreaming = ref(false)
const error = ref<string>()
const sidebarOpen = ref(true)

// Computed
const currentConversationId = computed(() => conversationStore.currentConversationId)
const currentConversation = computed(() => conversationStore.currentConversation)

// Chunk queue for smooth streaming
let chunkQueue: string[] = []
let isProcessingQueue = false

async function processChunkQueue() {
  if (isProcessingQueue) return
  isProcessingQueue = true

  while (chunkQueue.length > 0) {
    const chunk = chunkQueue.shift()
    if (chunk) {
      streamingMessage.value += chunk
      await nextTick()
      await new Promise((resolve) => setTimeout(resolve, 10))
    }
  }

  isProcessingQueue = false
}

onMounted(async () => {
  // Setup SignalR event handlers BEFORE connecting
  connection.on('ReceiveChunk', (chunk: string) => {
    chunkQueue.push(chunk)
    processChunkQueue()
  })

  connection.on('ReceiveComplete', async () => {
    // Wait for queue to finish processing
    while (chunkQueue.length > 0 || isProcessingQueue) {
      await new Promise((resolve) => setTimeout(resolve, 50))
    }

    // Add completed message to store
    if (streamingMessage.value && currentConversationId.value) {
      const completedMessage: MessageDto = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: streamingMessage.value,
        createdAt: new Date().toISOString(),
        sources: null,
      }
      conversationStore.addMessageToCurrentConversation(completedMessage)
    }

    // Clear streaming state
    streamingMessage.value = ''
    isStreaming.value = false
    chunkQueue = []

    // Refresh conversation list
    await conversationStore.fetchConversations()
  })

  connection.on('ReceiveError', (errorMsg: string) => {
    isStreaming.value = false
    streamingMessage.value = ''
    error.value = errorMsg

    if (currentConversationId.value) {
      conversationStore.addMessageToCurrentConversation({
        id: crypto.randomUUID(),
        role: 'assistant',
        content: '❌ Error: ' + errorMsg,
        createdAt: new Date().toISOString(),
        sources: null,
      })
    }
  })

  // Connect to SignalR
  try {
    await connect()
  } catch {
    console.warn('⚠️ SignalR not available, will use HTTP fallback')
  }

  // Load conversations
  await conversationStore.fetchConversations()

  // Load first conversation if available
  if (
    conversationStore.sortedConversations.length > 0 &&
    conversationStore.sortedConversations[0]
  ) {
    await conversationStore.loadConversation(conversationStore.sortedConversations[0].id)
  }
})

onUnmounted(() => {
  disconnect()
})

// Function to send message
const sendMessage = async () => {
  if (!userMessage.value.trim() || isStreaming.value) return

  // Create conversation if needed
  if (!currentConversationId.value) {
    try {
      await conversationStore.createConversation()
    } catch {
      error.value = 'Failed to create conversation'
      return
    }
  }

  error.value = undefined
  const messageText = userMessage.value

  // Add user message to store
  const userMsg: MessageDto = {
    id: crypto.randomUUID(),
    role: 'user',
    content: messageText,
    createdAt: new Date().toISOString(),
    sources: null,
  }
  conversationStore.addMessageToCurrentConversation(userMsg)

  userMessage.value = ''
  isStreaming.value = true
  streamingMessage.value = ''

  try {
    if (isConnected.value && currentConversationId.value) {
      // Use SignalR streaming
      await connection.invoke('StreamQuery', messageText, currentConversationId.value)
    } else {
      // Fallback to HTTP
      const response = await api.query({
        query: messageText,
        topK: 5,
        conversationId: currentConversationId.value || undefined,
      })

      const assistantMsg: MessageDto = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: response.answer,
        createdAt: new Date().toISOString(),
        sources: response.sources,
      }
      conversationStore.addMessageToCurrentConversation(assistantMsg)
      isStreaming.value = false
      await conversationStore.fetchConversations()
    }
  } catch (err: unknown) {
    let errorMessage = 'Failed to send message'
    if (err && typeof err === 'object' && 'response' in err) {
      const axiosError = err as { response?: { data?: { error?: string } } }
      errorMessage = axiosError.response?.data?.error || errorMessage
    }

    error.value = errorMessage
    conversationStore.addMessageToCurrentConversation({
      id: crypto.randomUUID(),
      role: 'assistant',
      content: '❌ Error: ' + errorMessage,
      createdAt: new Date().toISOString(),
      sources: null,
    })

    isStreaming.value = false
    streamingMessage.value = ''
  }
}

function toggleSidebar() {
  sidebarOpen.value = !sidebarOpen.value
}
</script>

<template>
  <div class="flex h-screen bg-gray-50">
    <!-- Sidebar -->
    <div
      v-show="sidebarOpen"
      class="w-80 flex-shrink-0 border-r border-gray-200 bg-white transition-all"
    >
      <ConversationList />
    </div>

    <!-- Main Chat Area -->
    <div class="flex-1 flex flex-col">
      <!-- Header -->
      <header class="bg-white shadow-sm px-6 py-4 border-b border-gray-200">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-4">
            <!-- Sidebar Toggle -->
            <button
              @click="toggleSidebar"
              class="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>

            <div>
              <h1 class="text-xl font-bold text-gray-800">
                {{ currentConversation?.title || 'RAG Agent Chat' }}
              </h1>
              <p v-if="currentConversation" class="text-xs text-gray-500">
                {{ currentConversation.messageCount }} messages
              </p>
            </div>
          </div>

          <!-- Connection Status -->
          <div
            v-if="isConnected"
            class="flex items-center gap-2 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm"
          >
            <span class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            <span>Real-time</span>
          </div>
          <div
            v-else
            class="flex items-center gap-2 px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm"
          >
            <span class="w-2 h-2 bg-yellow-500 rounded-full"></span>
            <span>HTTP</span>
          </div>
        </div>
      </header>

      <!-- Messages -->
      <MessageList />

      <!-- Streaming Message -->
      <div v-if="isStreaming" class="px-6 pb-4">
        <div class="max-w-2xl p-4 rounded-lg bg-white shadow-sm">
          <div class="font-semibold mb-1 flex items-center gap-2 text-sm">
            <span>AI Assistant</span>
            <span class="text-xs text-gray-500">(streaming...)</span>
          </div>
          <div class="whitespace-pre-wrap text-gray-900">
            {{ streamingMessage || '...' }}
            <span class="inline-block w-2 h-4 bg-gray-400 animate-pulse ml-1">▋</span>
          </div>
        </div>
      </div>

      <!-- Input Area -->
      <div class="bg-white border-t px-6 py-4 mt-auto">
        <div class="max-w-4xl mx-auto flex gap-2">
          <input
            v-model="userMessage"
            @keyup.enter="sendMessage"
            type="text"
            placeholder="Type your message..."
            :disabled="isStreaming"
            class="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
          />
          <button
            @click="sendMessage"
            :disabled="isStreaming || !userMessage.trim()"
            class="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {{ isStreaming ? 'Sending...' : 'Send' }}
          </button>
        </div>

        <!-- Error Display -->
        <div
          v-if="error"
          class="max-w-4xl mx-auto mt-2 p-3 bg-red-100 text-red-700 rounded-lg text-sm"
        >
          {{ error }}
        </div>
      </div>
    </div>
  </div>
</template>
