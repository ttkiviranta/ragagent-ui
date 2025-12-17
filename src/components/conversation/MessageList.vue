<script setup lang="ts">
import { computed, ref, watch, nextTick } from 'vue'
import { useConversationStore } from '@/stores/conversationStore'
import MessageBubble from './MessageBubble.vue'

const conversationStore = useConversationStore()
const messagesEndRef = ref<HTMLElement | null>(null)

const messages = computed(() => conversationStore.messages)
const isLoading = computed(() => conversationStore.isLoading)

// Auto-scroll to bottom when messages change
watch(
  () => messages.value.length,
  async () => {
    await nextTick()
    scrollToBottom()
  },
)

function scrollToBottom() {
  if (messagesEndRef.value) {
    messagesEndRef.value.scrollIntoView({ behavior: 'smooth' })
  }
}
</script>

<template>
  <div class="flex-1 overflow-y-auto px-6 py-4 space-y-4">
    <!-- Loading state -->
    <div v-if="isLoading && messages.length === 0" class="flex justify-center items-center h-full">
      <div class="text-gray-500">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
        <p class="mt-2">Loading messages...</p>
      </div>
    </div>

    <!-- Empty state -->
    <div
      v-else-if="messages.length === 0"
      class="flex flex-col justify-center items-center h-full text-gray-500"
    >
      <svg
        class="w-16 h-16 mb-4 text-gray-300"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
        />
      </svg>
      <p class="text-lg">No messages yet</p>
      <p class="text-sm mt-2">Start a conversation by sending a message below</p>
    </div>

    <!-- Messages -->
    <template v-else>
      <MessageBubble v-for="message in messages" :key="message.id" :message="message" />

      <!-- Scroll anchor -->
      <div ref="messagesEndRef"></div>
    </template>
  </div>
</template>
