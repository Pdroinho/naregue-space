import type { HTMLAttributes } from 'react'

export function AssistantMark({ className = '', ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span className={`assistant-brand-mark ${className}`.trim()} aria-hidden="true" {...props}>
      <img src="/brand/logo-symbol-approved-web.png" alt="" />
    </span>
  )
}

export function AssistantWordmark({ className = '', muted = false }: { className?: string; muted?: boolean }) {
  return <span className={`assistant-brand-wordmark ${muted ? 'is-muted' : ''} ${className}`.trim()}>Mestre</span>
}
