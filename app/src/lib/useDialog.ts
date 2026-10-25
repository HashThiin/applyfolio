import { useEffect, useLayoutEffect, useRef } from 'react'

const dialogs: HTMLElement[] = []
let previousOverflow = ''

const focusableSelector = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/** 浮层共用键盘边界；只有最上层响应 Esc 和 Tab，关闭后回到原入口。 */
export function useDialog(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null)
  const closeRef = useRef(onClose)

  useLayoutEffect(() => { closeRef.current = onClose }, [onClose])

  useEffect(() => {
    const dialog = ref.current
    if (!open || !dialog) return

    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null
    if (dialogs.length === 0) {
      previousOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
    }
    dialogs.push(dialog)
    dialog.focus({ preventScroll: true })

    function handleKeyDown(event: KeyboardEvent) {
      if (dialogs.at(-1) !== dialog || event.defaultPrevented) return
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopImmediatePropagation()
        closeRef.current()
      }
      if (event.key !== 'Tab') return
      const controls = [...dialog!.querySelectorAll<HTMLElement>(focusableSelector)]
        .filter((element) => element.tabIndex >= 0 && element.getClientRects().length > 0)
      const first = controls[0]
      const last = controls.at(-1)
      if (!first || !last) {
        event.preventDefault()
        dialog!.focus()
      } else if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog)) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialog)) {
        event.preventDefault()
        first.focus()
      }
    }

    function handleFocus(event: FocusEvent) {
      if (dialogs.at(-1) === dialog && !dialog!.contains(event.target as Node)) {
        dialog!.focus({ preventScroll: true })
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('focusin', handleFocus)
    return () => {
      const wasTopmost = dialogs.at(-1) === dialog
      const index = dialogs.indexOf(dialog)
      if (index >= 0) dialogs.splice(index, 1)
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('focusin', handleFocus)
      if (dialogs.length === 0) document.body.style.overflow = previousOverflow
      if (wasTopmost && trigger?.isConnected) trigger.focus({ preventScroll: true })
    }
  }, [open])

  return ref
}
