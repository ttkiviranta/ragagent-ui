<script setup lang="ts">
import { ref } from 'vue'
import { apiClient } from '@/services/apiClient'
import type { Message } from '@/types/api'

// Debuggaus - voit poistaa myöhemmin
console.log('API Base URL:', import.meta.env.VITE_API_BASE_URL)

// Reactive state
const userMessage = ref('')
const messages = ref<Message[]>([])
//const conversationId = ref<string>() // Voidaan ottaa käyttöön myöhemmin
const isLoading = ref(false)
const error = ref<string>()

// Function to send message to API
const sendMessage = async () => {
  if (!userMessage.value.trim() || isLoading.value) return

  // Clear previous error
  error.value = undefined

  // Add user message to UI immediately
  const userMsg: Message = {
    role: 'user',
    content: userMessage.value,
  }
  messages.value.push(userMsg)

  // Store message and clear input
  const messageText = userMessage.value
  userMessage.value = ''
  isLoading.value = true

  try {
    // Call RAG query endpoint
    const response = await apiClient.query({
      query: messageText,
      topK: 5,
    })

    // Add assistant response to UI
    messages.value.push({
      role: 'assistant',
      content: response.answer,
      sources: response.sources,
    })
  } catch (err) {
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
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="flex flex-col h-screen bg-gray-50">
    <!-- Header -->
    <header class="bg-white shadow-sm px-6 py-4">
      <h1 class="text-2xl font-bold text-gray-800">RAG Agent Chat</h1>
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
          <div class="text-sm font-semibold mb-2">Lähteet:</div>
          <div class="space-y-2">
            <div
              v-for="(source, idx) in msg.sources"
              :key="idx"
              class="text-sm bg-gray-50 p-2 rounded"
            >
              <a
                :href="source.url"
                target="_blank"
                class="text-blue-600 hover:underline font-medium"
              >
                {{ source.url }}
              </a>
              <div class="text-gray-600 text-xs mt-1">
                Relevanssi: {{ (source.relevanceScore * 100).toFixed(1) }}%
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty state -->
      <div v-if="messages.length === 0" class="text-center text-gray-500 mt-20">
        Aloita keskustelu kirjoittamalla viesti alle 👇
      </div>

      <!-- Loading indicator -->
      <div v-if="isLoading" class="flex items-center space-x-2 text-gray-500">
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
          :disabled="isLoading"
          class="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
        />
        <button
          @click="sendMessage"
          :disabled="isLoading || !userMessage.trim()"
          class="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {{ isLoading ? 'Lähettää...' : 'Lähetä' }}
        </button>
      </div>
    </div>
  </div>
</template>
