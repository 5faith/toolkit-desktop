import { useDiffStore } from '../store'
import * as Diff from 'diff'

export function useDiff() {
  const store = useDiffStore()

  function computeDiff() {
    const result = Diff.createPatch('diff', store.leftText, store.rightText)
    store.setDiffResult(result)
  }

  function computeLineDiff(): Diff.Change[] {
    return Diff.diffLines(store.leftText, store.rightText)
  }

  function computeWordDiff(): Diff.Change[] {
    return Diff.diffWords(store.leftText, store.rightText)
  }

  return {
    computeDiff,
    computeLineDiff,
    computeWordDiff,
  }
}
