<script setup lang="ts">
import type { ConversationDto } from '@/types/api'
import { computed } from 'vue'

const props = defineProps<{
  conversation: ConversationDto
  isActive: boolean
}>()

const emit = defineEmits<{
  (e: 'click'): void
}>()

const formattedDate = computed(() => {
  const date = new Date(props.conversation.lastMessageAt)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
})

const displayTitle = computed(() => {
  return props.conversation.title || 'Untitled Conversation'
})
</script>

<template>
  <div
    @click="emit('click')"
    :class="[
      'p-3 rounded-lg cursor-pointer transition-colors',
      isActive
        ? 'bg-blue-100 dark:bg-blue-900 border-l-4 border-blue-500'
        : 'hover:bg-gray-200 dark:hover:bg-gray-700',
    ]"
  >
    <div class="flex items-start justify-between">
      <div class="flex-1 min-w-0">
        <h3 class="font-medium text-sm text-gray-900 dark:text-white truncate">
          {{ displayTitle }}
        </h3>
        <div class="flex items-center gap-2 mt-1">
          <span class="text-xs text-gray-500">
            {{ conversation.messageCount }} message{{ conversation.messageCount !== 1 ? 's' : '' }}
          </span>
          <span class="text-xs text-gray-400">•</span>
          <span class="text-xs text-gray-500">
            {{ formattedDate }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>
