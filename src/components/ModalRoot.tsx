import { createPortal } from 'react-dom'
import type { HTMLAttributes, ReactNode } from 'react'

/**
 * Root surface for transactional overlays.
 *
 * The node is always portalled directly to document.body so a transformed,
 * clipped or width-constrained application ancestor can never limit the
 * backdrop or the fixed dialog geometry. Styling and stacking remain owned by
 * the shared overlay contract, so individual screens cannot lower a dialog.
 */
type ModalRootProps = Omit<HTMLAttributes<HTMLDivElement>, 'className' | 'style'> & { children: ReactNode }

export function ModalRoot({ children, ...props }: ModalRootProps) {
  if (typeof document === 'undefined') return null
  return createPortal(
    <div {...props} className="nr-overlay" data-blocking-overlay="true">
      {children}
    </div>,
    document.body,
  )
}
