<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { useChatHub } from '@/composables/useChatHub'
import { useApi } from '@/composables/useApi'
import type { Message } from '@/types/api'

const { connection, isConnected, connect, disconnect } = useChatHub()
const api = useApi()

// Reactive state
const userMessage = ref('')
const messages = ref<Message[]>([])
const conversationId = ref<string | null>(null)
const streamingMessage = ref('')
const isStreaming = ref(false)
const error = ref<string>()

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
      // Small delay for smooth visual streaming
      await new Promise((resolve) => setTimeout(resolve, 10))
    }
  }

  isProcessingQueue = false
}

onMounted(async () => {
  // Setup SignalR event handlers BEFORE connecting
  connection.on('ReceiveChunk', (chunk: string) => {
    console.log('📝 Received chunk:', chunk)
    chunkQueue.push(chunk)
    processChunkQueue()
  })

  connection.on('ReceiveComplete', async () => {
    console.log('✅ Stream complete')

    // Wait for queue to finish processing
    while (chunkQueue.length > 0 || isProcessingQueue) {
      await new Promise((resolve) => setTimeout(resolve, 50))
    }

    // Add the completed message to history
    if (streamingMessage.value) {
      messages.value.push({
        role: 'assistant',
        content: streamingMessage.value,
      })
    }

    // Clear streaming state
    streamingMessage.value = ''
    isStreaming.value = false
    chunkQueue = []
  })

  connection.on('ReceiveError', (errorMsg: string) => {
    console.error('❌ SignalR streaming error:', errorMsg)
    isStreaming.value = false
    streamingMessage.value = ''
    error.value = errorMsg

    messages.value.push({
      role: 'assistant',
      content: '❌ Virhe: ' + errorMsg,
    })
  })

  // Connect to SignalR
  try {
    await connect()
    console.log('✅ SignalR connected to:', connection.baseUrl)
    console.log('📡 Connection state:', connection.state)
  } catch (err) {
    console.warn('⚠️ SignalR not available, will use HTTP fallback:', err)
  }

  // Load or create conversation
  await initConversation()
})

onUnmounted(() => {
  disconnect()
})

async function initConversation() {
  try {
    const conversations = await api.getConversations()

    if (conversations && conversations.length > 0 && conversations[0]) {
      conversationId.value = conversations[0].id
      await loadHistory(conversations[0].id)
    } else {
      const newConv = await api.createConversation('New Chat')
      if (newConv) {
        conversationId.value = newConv.id
      }
    }
  } catch (err: unknown) {
    console.error('Failed to initialize conversation:', err)
    // Continue without conversation ID - HTTP fallback will still work
  }
}

async function loadHistory(id: string) {
  try {
    const history = await api.getConversationHistory(id)
    if (history) {
      messages.value = history
    }
  } catch (err: unknown) {
    console.error('Failed to load conversation history:', err)
  }
}

// Function to send message to API
const sendMessage = async () => {
  if (!userMessage.value.trim() || isStreaming.value) return

  // Clear previous error
  error.value = undefined

  const messageText = userMessage.value

  // Add user message to UI immediately
  messages.value.push({
    role: 'user',
    content: messageText,
  })

  // Clear input
  userMessage.value = ''
  isStreaming.value = true
  streamingMessage.value = ''

  try {
    if (isConnected.value && conversationId.value) {
      // Use SignalR streaming
      console.log('🚀 Using SignalR streaming...')
      console.log('📡 Connection state:', connection.state)
      console.log('💬 ConversationId:', conversationId.value)
      console.log('❓ Query:', messageText)
      await connection.invoke('StreamQuery', messageText, conversationId.value)
    } else {
      // Fallback to HTTP
      console.warn('⚠️ Using HTTP fallback')
      console.warn('   - isConnected:', isConnected.value)
      console.warn('   - conversationId:', conversationId.value)
      const response = await api.query({
        query: messageText,
        topK: 5,
      })

      // Add assistant response to UI
      messages.value.push({
        role: 'assistant',
        content: response.answer,
        sources: response.sources,
      })

      isStreaming.value = false
    }
  } catch (err: unknown) {
    console.error('Error sending message:', err)

    let errorMessage = 'Virhe lähetettäessä viestiä. Tarkista että API on käynnissä.'

    if (err && typeof err === 'object' && 'response' in err) {
      const axiosError = err as { response?: { data?: { error?: string } } }
      errorMessage = axiosError.response?.data?.error || errorMessage
    }

    error.value = errorMessage

    // Add error message to chat
    messages.value.push({
      role: 'assistant',
      content: '❌ Virhe: ' + errorMessage,
    })

    isStreaming.value = false
    streamingMessage.value = ''
  }
}
</script>

<template>
  <div class="flex flex-col h-screen bg-gray-50">
    <!-- Header -->
    <header class="bg-white shadow-sm px-6 py-4">
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-bold text-gray-800">RAG Agent Chat</h1>

        <!-- Connection Status -->
        <div
          v-if="isConnected"
          class="flex items-center gap-2 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm"
        >
          <span class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
          <span>Real-time streaming</span>
        </div>
        <div
          v-else
          class="flex items-center gap-2 px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm"
        >
          <span class="w-2 h-2 bg-yellow-500 rounded-full"></span>
          <span>HTTP fallback</span>
        </div>
      </div>
    </header>

    <!-- Messages Area -->
    <div class="flex-1 overflow-y-auto px-6 py-4 space-y-4">
      <div
        v-for="(msg, index) in messages"
        :key="index"
        :class="[
          'p-4 rounded-lg max-w-2xl',
          msg.role === 'user' ? 'bg-blue-500 text-white ml-auto' : 'bg-white shadow-sm',
        ]"
      >
        <div class="font-semibold mb-1">
          {{ msg.role === 'user' ? 'Sinä' : 'AI Assistentti' }}
        </div>
        <div class="whitespace-pre-wrap">{{ msg.content }}</div>

        <!-- Sources (if available) -->
        <div
          v-if="msg.sources && msg.sources.length > 0"
          class="mt-3 pt-3 border-t border-gray-200"
        >
          <div class="text-sm font-semibold mb-2">📚 Lähteet:</div>
          <div class="space-y-2">
            <div
              v-for="(source, idx) in msg.sources"
              :key="idx"
              class="text-sm bg-gray-50 p-2 rounded"
            >
              <a
                :href="source.url"
                target="_blank"
                class="text-blue-600 hover:underline font-medium block mb-1"
              >
                {{ source.url }}
              </a>
              <div class="text-gray-600 text-xs">
                Relevanssi: {{ (source.relevanceScore * 100).toFixed(1) }}%
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Streaming Message -->
      <div v-if="isStreaming" class="p-4 rounded-lg max-w-2xl bg-white shadow-sm">
        <div class="font-semibold mb-1 flex items-center gap-2">
          <span>AI Assistentti</span>
          <span class="text-xs text-gray-500">(streaming...)</span>
        </div>
        <div class="whitespace-pre-wrap">
          {{ streamingMessage || '...' }}
          <span class="inline-block w-2 h-4 bg-gray-400 animate-pulse ml-1">▋</span>
        </div>
      </div>

      <!-- Empty state -->
      <div
        v-if="messages.length === 0 && !streamingMessage"
        class="text-center text-gray-500 mt-20"
      >
        <p class="text-lg mb-2">Aloita keskustelu kirjoittamalla viesti alle 👇</p>
        <p class="text-sm text-gray-400">
          {{ isConnected ? '✨ Real-time streaming käytössä' : '💬 HTTP-tila käytössä' }}
        </p>
      </div>

      <!-- Loading indicator -->
      <div
        v-if="isStreaming && !streamingMessage"
        class="flex items-center space-x-2 text-gray-500"
      >
        <div class="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-900"></div>
        <span>Käsitellään kysymystä...</span>
      </div>
    </div>

    <!-- Input Area -->
    <div class="bg-white border-t px-6 py-4">
      <div class="max-w-4xl mx-auto flex gap-2">
        <input
          v-model="userMessage"
          @keyup.enter="sendMessage"
          type="text"
          placeholder="Kirjoita viesti..."
          :disabled="isStreaming"
          class="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
        />
        <button
          @click="sendMessage"
          :disabled="isStreaming || !userMessage.trim()"
          class="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {{ isStreaming ? 'Lähettää...' : 'Lähetä' }}
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
</template>
