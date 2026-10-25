import { AssistantMark } from './AssistantBrand'
export function AssistantContextAction({ screen }: { screen: string }) {
  return (
    <button
      type="button"
      className="assistant-context-action"
      data-tour="assistant-context"
      aria-label="Pedir ajuda ao Mestre AI nesta tela"
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
