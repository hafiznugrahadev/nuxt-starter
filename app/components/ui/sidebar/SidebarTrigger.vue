<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { PanelLeftIcon } from '@lucide/vue'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useSidebar } from './utils'

const props = defineProps<{
  class?: HTMLAttributes['class']
}>()

const { toggleSidebar } = useSidebar()
</script>

<template>
  <Button
    data-sidebar="trigger"
    data-slot="sidebar-trigger"
    variant="ghost"
    size="icon"
    :class="cn('hover:bg-lightprimary hover:text-primary dark:hover:bg-lightprimary dark:hover:text-primary h-10 w-10 rounded-full', props.class)"
    @click="toggleSidebar"
  >
    <PanelLeftIcon class="size-5" />
    <span class="sr-only">Toggle Sidebar</span>
  </Button>
</template>
