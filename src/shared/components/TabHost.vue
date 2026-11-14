<template>
  <component :is="component" v-if="component" />
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, provide } from 'vue'
import { moduleRegistry } from '@core/module-registry'
import { TAB_ID_KEY } from '@shared/composables/useCurrentTab'
import { disposeTabStores } from '@shared/composables/useTabStore'

const props = defineProps<{
  tabId: string
  moduleId: string
}>()

provide(TAB_ID_KEY, props.tabId)

const component = computed(() => moduleRegistry.get(props.moduleId)?.route.component)

onBeforeUnmount(() => {
  disposeTabStores(props.moduleId, props.tabId)
})
</script>
