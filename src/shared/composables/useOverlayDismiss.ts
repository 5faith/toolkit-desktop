/**
 * 遮罩层点击关闭保护。
 *
 * 仅当鼠标按下与松开都发生在遮罩本身时才触发关闭，
 * 避免从弹窗内部拖拽到弹窗外松开时因 click 落在遮罩上而误关闭。
 */
export function useOverlayDismiss(onDismiss: () => void) {
  let pressedOnOverlay = false
  let releasedOnOverlay = false

  function onMouseDown(event: MouseEvent) {
    pressedOnOverlay = event.target === event.currentTarget
  }

  function onMouseUp(event: MouseEvent) {
    releasedOnOverlay = event.target === event.currentTarget
  }

  function onClick(event: MouseEvent) {
    if (pressedOnOverlay && releasedOnOverlay && event.target === event.currentTarget) {
      onDismiss()
    }
    pressedOnOverlay = false
    releasedOnOverlay = false
  }

  return { onMouseDown, onMouseUp, onClick }
}
