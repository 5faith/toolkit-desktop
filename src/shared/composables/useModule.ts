import { computed } from 'vue'
import { moduleRegistry } from '@core/module-registry'

export function useModule() {
  const activeModuleId = moduleRegistry.activeModuleId

  const activeModule = computed(() => {
    return moduleRegistry.get(activeModuleId.value)
  })

  const allModules = computed(() => moduleRegistry.getAll())

  function switchModule(id: string) {
    moduleRegistry.activate(id)
  }

  return {
    activeModuleId,
    activeModule,
    allModules,
    switchModule,
  }
}
