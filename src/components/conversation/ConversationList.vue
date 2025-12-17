<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useConversationStore } from '@/stores/conversationStore'
import ConversationItem from './ConversationItem.vue'

const conversationStore = useConversationStore()
const showNewChatDialog = ref(false)

const sortedConversations = computed(() => conversationStore.sortedConversations)
const isLoading = computed(() => conversationStore.isLoading)
const currentConversationId = computed(() => conversationStore.currentConversationId)

onMounted(async () => {
  try {
    await conversationStore.fetchConversations()
  } catch (err) {
    console.error('Failed to load conversations:', err)
  }
})

function selectConversation(id: string) {
  conversationStore.loadConversation(id)
}

function handleNewChat() {
  showNewChatDialog.value = true
}

async function createNewConversation(title?: string) {
  try {
    await conversationStore.createConversation(title)
    showNewChatDialog.value = false
  } catch (err) {
    console.error('Failed to create conversation:', err)
  }
}
</script>

<template>
  <div class="flex flex-col h-full bg-gray-100 dark:bg-gray-800 border-r border-gray-200">
    <!-- Header with New Chat button -->
    <div class="p-4 border-b border-gray-200">
      <button
        @click="handleNewChat"
        class="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
      >
        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 4v16m8-8H4"
          />
        </svg>
        <span>New Chat</span>
      </button>
    </div>

    <!-- Conversation List -->
    <div class="flex-1 overflow-y-auto">
      <div
        v-if="isLoading && sortedConversations.length === 0"
        class="p-4 text-center text-gray-500"
      >
        Loading conversations...
      </div>

      <div v-else-if="sortedConversations.length === 0" class="p-4 text-center text-gray-500">
        <p class="text-sm">No conversations yet</p>
        <p class="text-xs mt-2">Click "New Chat" to start</p>
      </div>

      <div v-else class="space-y-1 p-2">
        <ConversationItem
          v-for="conversation in sortedConversations"
          :key="conversation.id"
          :conversation="conversation"
          :isActive="conversation.id === currentConversationId"
          @click="selectConversation(conversation.id)"
        />
      </div>
    </div>

    <!-- New Chat Dialog -->
    <teleport to="body">
      <div
        v-if="showNewChatDialog"
        class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
        @click.self="showNewChatDialog = false"
      >
        <div class="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
          <h2 class="text-xl font-bold mb-4">New Conversation</h2>

          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2"> Title (optional) </label>
            <input
              ref="titleInput"
              type="text"
              placeholder="Enter conversation title..."
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              @keyup.enter="
                createNewConversation(
                  (($refs.titleInput as HTMLInputElement)?.value || '').trim() || undefined,
                )
              "
            />
          </div>

          <div class="flex gap-2 justify-end">
            <button
              @click="showNewChatDialog = false"
              class="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
            <button
              @click="
                createNewConversation(
                  (($refs.titleInput as HTMLInputElement)?.value || '').trim() || undefined,
                )
              "
              class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Create
            </button>
          </div>
        </div>
      </div>
    </teleport>
  </div>
</template>
