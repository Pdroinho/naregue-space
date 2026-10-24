import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AssistantConversation } from './AssistantConversation'
import { AssistantMark } from './AssistantBrand'

export function AssistantChatLauncher({ floating = false }: { floating?: boolean } = {}) {
  const [open, setOpen] = useState(false)
  const [initialPrompt, setInitialPrompt] = useState('')
  const triggerRef = useRef<HTMLButtonElement>(null)
  const openerRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    const onOpen = (event: Event) => {
      const detail = (event as CustomEvent<{ prompt?: string }>).detail
      openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
      setInitialPrompt(String(detail?.prompt ?? ''))
      setOpen(true)
    }
    window.addEventListener('naregua:assistant-open', onOpen as EventListener)
    return () => window.removeEventListener('naregua:assistant-open', onOpen as EventListener)
  }, [])

  useEffect(() => {
    if (!open) return
    const focusTarget = openerRef.current ?? triggerRef.current
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onEscape)
    return () => {
      window.removeEventListener('keydown', onEscape)
      window.requestAnimationFrame(() => focusTarget?.focus({ preventScroll: true }))
    }
  }, [open])

  return (
    <>
      {floating ? <button ref={triggerRef} type="button" className="assistant34-launcher" aria-label="Conversar com o Mestre AI" title="Conversar com o Mestre AI" aria-expanded={open} onClick={() => setOpen(true)}>
        <AssistantMark className="assistant34-launcher-mark" />
        <span className="assistant-launcher-tooltip" role="tooltip">Conversar com o Mestre AI</span>
      </button> : null}
      {open && typeof document !== 'undefined'
        ? createPortal(
            <div className="assistant34-layer" data-blocking-overlay="true" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false) }}>
              <section className="assistant34-drawer" role="dialog" aria-modal="true" aria-label="Conversa com o Mestre AI">
                <AssistantConversation variant="drawer" onClose={() => setOpen(false)} initialPrompt={initialPrompt} />
              </section>
            </div>,
            document.body,
          )
        : null}
    </>
  )
}
