import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AssistantConversation } from './AssistantConversation'
import { Sparkles } from './Icons'

export function AssistantChatLauncher() {
  const [open, setOpen] = useState(false)
  const [initialPrompt, setInitialPrompt] = useState('')
  const triggerRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const onOpen = (event: Event) => {
      const detail = (event as CustomEvent<{ prompt?: string }>).detail
      setInitialPrompt(String(detail?.prompt ?? ''))
      setOpen(true)
    }
    window.addEventListener('naregua:assistant-open', onOpen as EventListener)
    return () => window.removeEventListener('naregua:assistant-open', onOpen as EventListener)
  }, [])

  useEffect(() => {
    if (!open) return
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onEscape)
    return () => {
      window.removeEventListener('keydown', onEscape)
      window.requestAnimationFrame(() => triggerRef.current?.focus({ preventScroll: true }))
    }
  }, [open])

  if (typeof document === 'undefined') return null

  return createPortal(
    <>
      <button ref={triggerRef} type="button" className="nr-assistant-launcher" aria-label="Conversar com o Mestre AI" aria-expanded={open} onClick={() => setOpen(true)}>
        <Sparkles size={22} aria-hidden="true" />
        <span className="sr-only">Conversar com o Mestre AI</span>
      </button>
      {open ? (
        <div className="nr-assistant-layer" data-blocking-overlay="true" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false) }}>
          <section className="nr-assistant-drawer" role="dialog" aria-modal="true" aria-label="Conversa com o Mestre AI">
            <AssistantConversation variant="drawer" onClose={() => setOpen(false)} initialPrompt={initialPrompt} />
          </section>
        </div>
      ) : null}
    </>,
    document.body,
  )
}
