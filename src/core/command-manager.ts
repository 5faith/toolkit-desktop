import { computed, ref, type ComputedRef } from 'vue'

export interface Command {
  id: string
  execute(): void
  undo(): void
  description: string
}

class CommandManager {
  private undoStack = ref<Command[]>([])
  private redoStack = ref<Command[]>([])

  get canUndo(): ComputedRef<boolean> {
    return computed(() => this.undoStack.value.length > 0)
  }

  get canRedo(): ComputedRef<boolean> {
    return computed(() => this.redoStack.value.length > 0)
  }

  execute(cmd: Command): void {
    cmd.execute()
    this.undoStack.value.push(cmd)
    this.redoStack.value = []
  }

  undo(): void {
    const cmd = this.undoStack.value.pop()
    if (cmd) {
      cmd.undo()
      this.redoStack.value.push(cmd)
    }
  }

  redo(): void {
    const cmd = this.redoStack.value.pop()
    if (cmd) {
      cmd.execute()
      this.undoStack.value.push(cmd)
    }
  }

  clear(): void {
    this.undoStack.value = []
    this.redoStack.value = []
  }
}

export const commandManager = new CommandManager()
