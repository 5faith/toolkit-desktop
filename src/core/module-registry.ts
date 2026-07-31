import { ref, type Ref } from 'vue'
import type { ToolModule } from './module'

class ModuleRegistry {
  private modules = new Map<string, ToolModule>()
  private _activeModuleId: Ref<string> = ref('')

  get activeModuleId(): Ref<string> {
    return this._activeModuleId
  }

  register(module: ToolModule): void {
    if (this.modules.has(module.id)) {
      console.warn(`Module "${module.id}" is already registered`)
      return
    }
    this.modules.set(module.id, module)
  }

  get(id: string): ToolModule | undefined {
    return this.modules.get(id)
  }

  getAll(): ToolModule[] {
    return Array.from(this.modules.values())
  }

  activate(id: string): void {
    const currentId = this._activeModuleId.value
    if (currentId === id) return

    if (currentId) {
      const currentModule = this.modules.get(currentId)
      currentModule?.onDeactivate?.()
    }

    const newModule = this.modules.get(id)
    if (!newModule) {
      console.warn(`Module "${id}" not found`)
      return
    }

    this._activeModuleId.value = id
    newModule.onActivate?.()
  }
}

export const moduleRegistry = new ModuleRegistry()
