import { AssistantMark } from './AssistantBrand'
export function AssistantContextAction({ screen }: { screen: string }) {
  return (
    <button
      type="button"
      className="btn btn-ghost assistant-context-action"
      data-tour="assistant-context"
      aria-label="Pedir ajuda à Assistant nesta tela"
      onClick={() =>
        window.dispatchEvent(
          new CustomEvent('naregua:assistant-open', {
            detail: {
              screen,
            },
          }),
        )
      }
    >
      <AssistantMark />
      <strong>Mestre AI</strong>
    </button>
  )
}
