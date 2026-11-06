import {
  cloneElement,
  isValidElement,
  useId,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'

export function EmptyState(props: {
  image?: string
  icon?: ReactNode
  title: string
  description?: string
  compact?: boolean
}) {
  return (
    <div className={`empty-state ${props.compact ? 'compact' : ''}`}>
      {props.icon ? <div className="empty-state-icon" aria-hidden="true">{props.icon}</div> : props.image?.startsWith('/icons/hugeicons/') ? <div className="empty-state-icon" aria-hidden="true"><span className="nr-icon" style={{display:'inline-block',width:48,height:48,backgroundColor:'currentColor',mask:`url("${props.image}") center / contain no-repeat`,WebkitMask:`url("${props.image}") center / contain no-repeat`}} /></div> : props.image ? <img
        decoding="async"
        src={props.image}
        alt=""
        aria-hidden="true"
        loading="lazy"
      /> : null}
      <strong>{props.title}</strong>
      {props.description ? <span>{props.description}</span> : null}
    </div>
  )
}

export function Switch({
  checked,
  onChange,
  disabled = false,
  label,
  ariaLabel,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
  label?: string
  ariaLabel?: string
}) {
  return (
    <label className={label ? 'switch-field' : 'switch-toggle'}>
      <span className={label ? 'switch-toggle' : undefined}>
        <input
          type="checkbox"
          role="switch"
          aria-checked={checked}
          aria-label={ariaLabel ?? label}
          checked={checked}
          disabled={disabled}
          onChange={(event) => onChange(event.target.checked)}
        />
        <span className="switch-toggle-slider" aria-hidden="true" />
      </span>
      {label ? <span className="switch-field-label">{label}</span> : null}
    </label>
  )
}

export function SidebarItem(props: {
  active?: boolean
  icon: ReactNode
  label: string
  onClick?: () => void
  disabled?: boolean
}) {
  const tooltipId = useId()
  const [tooltip, setTooltip] = useState<{ left: number; top: number } | null>(null)
  const revealLabel = (button: HTMLButtonElement) => {
    if (!window.matchMedia('(min-width: 901px)').matches || !button.closest('.is-sidebar-collapsed')) return
    const box = button.getBoundingClientRect()
    setTooltip({ left: box.right + 14, top: box.top + box.height / 2 })
  }
  const icon = isValidElement(props.icon)
    ? cloneElement(
        props.icon as ReactElement<{ weight?: 'regular' | 'duotone' }>,
        { weight: props.active ? 'duotone' : 'regular' },
      )
    : props.icon
  return (
    <><button
      type="button"
      className={`ld-nav-item ${props.active ? 'is-active' : ''}`}
      onClick={() => { setTooltip(null); props.onClick?.() }}
      onMouseEnter={event => revealLabel(event.currentTarget)}
      onMouseLeave={() => setTooltip(null)}
      onFocus={event => revealLabel(event.currentTarget)}
      onBlur={() => setTooltip(null)}
      onPointerDown={() => setTooltip(null)}
      onWheel={() => setTooltip(null)}
      onKeyDown={event => { if (event.key === 'Escape') setTooltip(null) }}
      disabled={props.disabled}
      aria-current={props.active ? 'page' : undefined}
      aria-label={props.label}
      title={tooltip ? undefined : props.label}
      aria-describedby={tooltip ? tooltipId : undefined}
      data-label={props.label}
    >
      <span className="ld-nav-icon" aria-hidden="true">
        {icon}
      </span>
      <span className="ld-nav-text">{props.label}</span>
    </button>{tooltip ? createPortal(<span id={tooltipId} role="tooltip" className="sidebar-item-tooltip" style={{ left: tooltip.left, top: tooltip.top }}>{props.label}</span>, document.body) : null}</>
  )
}
