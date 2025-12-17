<script setup lang="ts">
import type { MessageDto } from '@/types/api'
import { computed } from 'vue'

const props = defineProps<{
  message: MessageDto
}>()

const isUser = computed(() => props.message.role === 'user')

const formattedTime = computed(() => {
  const date = new Date(props.message.createdAt)
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
})
</script>

<template>
  <div :class="['flex', isUser ? 'justify-end' : 'justify-start']">
    <div
      :class="[
        'max-w-2xl p-4 rounded-lg',
        isUser ? 'bg-blue-500 text-white' : 'bg-white shadow-sm',
      ]"
    >
      <!-- Message header -->
      <div class="flex items-center justify-between mb-1">
        <span class="font-semibold text-sm">
          {{ isUser ? 'You' : 'AI Assistant' }}
        </span>
        <span :class="['text-xs ml-2', isUser ? 'text-blue-100' : 'text-gray-500']">
          {{ formattedTime }}
        </span>
      </div>

      <!-- Message content -->
      <div class="whitespace-pre-wrap" :class="isUser ? 'text-white' : 'text-gray-900'">
        {{ message.content }}
      </div>

      <!-- Sources -->
      <div
        v-if="message.sources && message.sources.length > 0"
        class="mt-3 pt-3 border-t"
        :class="isUser ? 'border-blue-400' : 'border-gray-200'"
      >
        <div class="text-sm font-semibold mb-2" :class="isUser ? 'text-blue-100' : 'text-gray-700'">
          📚 Sources:
        </div>
        <div class="space-y-2">
          <div
            v-for="(source, idx) in message.sources"
            :key="idx"
            class="text-sm p-2 rounded"
            :class="isUser ? 'bg-blue-400 bg-opacity-30' : 'bg-gray-50'"
          >
            <a
              :href="source.url"
              target="_blank"
              class="font-medium block mb-1 hover:underline"
              :class="isUser ? 'text-blue-100' : 'text-blue-600'"
            >
              {{ source.url }}
            </a>
            <div class="text-xs" :class="isUser ? 'text-blue-100' : 'text-gray-600'">
              Relevance: {{ (source.relevanceScore * 100).toFixed(1) }}%
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
