import { useState } from 'react'
import { ProductSelect } from '../../components/ProductSelect'
import { AssistantOperationDialog, type ReviewAction,  } from './AssistantOperationDialog'
import { prepareAssistantOperation } from '../../lib/assistantActions'
export type Preferences = { tone: string; focus: string; instructions: string }
export function AssistantPreferences({
  initial,
  onSaved,
}: {
  initial: Preferences
  onSaved: () => void
}) {
  const [values, setValues] = useState(initial),
    [review, setReview] = useState<ReviewAction | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('')
  async function prepare() {
    setBusy(true)
    setError('')
    try {
      setReview(await prepareAssistantOperation('prepare_assistant_preferences', values))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível salvar.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <section className="card assistant-work-form" data-tour="assistant-preferences">
      <h2>Do seu jeito</h2>
      <p className="form-help">
        Escolha como prefere conversar e o que é mais importante para o espaço.
        Você pode ajustar isso quando quiser.
      </p>
      <label className="label">
        Como o Mestre AI deve responder?
        <ProductSelect
          ariaLabel="Tom do Mestre AI"
          value={values.tone}
          options={[
            { value: 'FRIENDLY', label: 'Acolhedora e prática' },
            { value: 'DIRECT', label: 'Direta e resumida' },
            { value: 'DETAILED', label: 'Com mais explicações' },
          ]}
          onChange={(tone) => setValues({ ...values, tone })}
        />
      </label>
      <label className="label">
        Qual é seu foco agora?
        <ProductSelect
          ariaLabel="Foco do Mestre AI"
          value={values.focus}
          options={[
            { value: 'GENERAL', label: 'Minha rotina como um todo' },
            { value: 'AGENDA', label: 'Organizar a agenda' },
            { value: 'FINANCE', label: 'Cuidar do financeiro' },
            { value: 'CLIENTS', label: 'Relacionamento com os clientes' },
          ]}
          onChange={(focus) => setValues({ ...values, focus })}
        />
      </label>
      <label className="label">
        O que ela precisa saber sobre sua rotina? (opcional)
        <textarea
          className="input"
          value={values.instructions}
          maxLength={1000}
          rows={4}
          onChange={(e) =>
            setValues({ ...values, instructions: e.target.value })
          }
          placeholder="Ex.: prefiro sugestões simples e tenho pouco tempo para administrar o espaço."
        />
      </label>
      <small className="form-help">
        Não inclua senhas ou informações pessoais dos clientes. Estas
        preferências não mudam as permissões da plataforma.
      </small>
      {error ? (
        <p role="alert" className="form-error">
          {error}
        </p>
      ) : null}
      <button
        type="button"
        className="btn btnPrimary"
        disabled={busy}
        onClick={() => void prepare()}
      >
        {busy ? 'Preparando…' : 'Salvar preferências'}
      </button>
      {review ? (
        <AssistantOperationDialog
          action={review}
          onClose={() => setReview(null)}
          onDone={() => {
            setReview(null)
            onSaved()
          }}
        />
      ) : null}
    </section>
  )
}
