import './billing-center.css'
import { useEffect, useState } from 'react'
import { api } from '../api'
import {
  PUBLIC_TEAM_PLANS,
  validTeamPlans,
  orderedTeamPlans,
  type TeamPlan,
} from '../teamPlans'
import { confirmAction,notify } from '../lib/feedback'
import { formatTaxId,validTaxId } from '../../server/taxId'
type Order = {
  orderNsu: string
  amountCents: number
  status: string
  createdAt: string
  paidAt: string | null
}
type TeamCatalog = {
  plans: TeamPlan[]
  checkoutAvailable: boolean
  billingIdentityComplete?:boolean
  recurringStatus?:string|null
  activeProfessionals: number
  currentSubscription: null | {
    planCode: string | null
    currentPeriodEnd: string | null
    recurring?:boolean
    autoRenew?:boolean
  }
  quotes?: Record<string,{amountCents:number;discountPercent:number;source:string;debtRecoveryPercent?:number}>
  orders?: Order[]
}
const money = (cents: number) =>
  (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
export function BillingCenter({ locked = false }: { locked?: boolean }) {
  const [taxId,setTaxId]=useState(''),[recurringAccepted,setRecurringAccepted]=useState(false)
  const [catalog, setCatalog] = useState<TeamCatalog | null>(null),
    [orders, setOrders] = useState<Order[]>([]),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [code, setCode] = useState<TeamPlan['code']>('TEAM_3'),
    [retry, setRetry] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    let current = true
    setLoading(true)
    setError('')
    setCatalog(null)
    void api<TeamCatalog>('/api/admin/subscription/team-plans', {
      signal: controller.signal,
    }).then((res) => {
      if (!current) return
      if (res.ok && validTeamPlans(res.data?.plans)) {
        const plans = orderedTeamPlans(res.data.plans)
        setCatalog({ ...res.data, checkoutAvailable: res.data.checkoutAvailable === true, plans })
        setCode(
          plans.find((plan) => plan.code === res.data.currentSubscription?.planCode)
            ?.code ?? plans.find((plan) => plan.seats >= res.data.activeProfessionals)
            ?.code ?? 'TEAM_15',
        )
        setOrders((previous) => [
          ...(res.data.orders ?? []),
          ...previous.filter(
            (old) =>
              !(res.data.orders ?? []).some(
                (next) => next.orderNsu === old.orderNsu,
              ),
          ),
        ])
      } else
        setError(
          res.ok
            ? 'O catálogo recebido é inválido. Atualize antes de contratar.'
            : res.error.message,
        )
      setLoading(false)
    })
    // Existing financial records remain visible; they never replace the current offer.
    if (!locked)
      void api<{ orders: Order[] }>('/api/admin/billing/overview', {
        signal: controller.signal,
      }).then((res) => {
        if (current && res.ok && Array.isArray(res.data?.orders))
          setOrders((previous) => [
            ...previous,
            ...res.data.orders.filter(
              (order) =>
                !previous.some((item) => item.orderNsu === order.orderNsu),
            ),
          ])
      })
    return () => {
      current = false
      controller.abort()
    }
  }, [locked, retry])
  useEffect(() => {
    if (!locked || !catalog?.checkoutAvailable) return
    const controller = new AbortController()
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible')
        void api<{
          user: {
            billingRecovery?: boolean
            subscriptionStatus?: string
          } | null
        }>('/api/auth/me', { signal: controller.signal }).then((res) => {
          if (
            !controller.signal.aborted &&
            res.ok &&
            res.data.user?.subscriptionStatus === 'ACTIVE' &&
            !res.data.user.billingRecovery
          )
            window.location.reload()
        })
    }, 5000)
    return () => {
      controller.abort()
      window.clearInterval(timer)
    }
  }, [locked, catalog?.checkoutAvailable])
  const plans = catalog?.plans ?? PUBLIC_TEAM_PLANS,
    selected = plans.find((plan) => plan.code === code) ?? plans[0]
  const tooSmall = Boolean(
      catalog && selected.seats < catalog.activeProfessionals,
    ),
    active = Boolean(catalog?.currentSubscription)||catalog?.recurringStatus==='ACTIVE'
  const quote=catalog?.quotes?.[code]
  const finalAmount=quote?.amountCents ?? selected.amountCents
  async function startTeamCheckout() {
    if (busy || loading || !catalog?.checkoutAvailable || tooSmall || active)
      return
    if(!recurringAccepted){setError('Confirme a renovação mensal automática antes de continuar.');return}
    if(!catalog.billingIdentityComplete&&!validTaxId(taxId)){setError('Informe um CPF ou CNPJ válido para o pagamento.');return}
    setBusy(true)
    setError('')
    const res = await api<{ checkoutUrl: string; intentId: string }>(
      '/api/admin/subscription/team-checkout',
      { method: 'POST', body: JSON.stringify({ planCode: code,recurringAccepted,...(taxId?{taxId}:{}) }) },
    )
    if (!res.ok) {
      setError(res.error.message)
      notify(res.error.message, 'error')
      setBusy(false)
      return
    }
    localStorage.setItem(
      'naregua:payment-pending-intent',
      res.data.intentId,
    )
    window.location.assign(res.data.checkoutUrl)
  }
  async function cancelRenewal(){
    if(busy||!await confirmAction({title:'Cancelar renovação automática?',message:'Não haverá novas cobranças. Seu acesso continua até o fim do período já pago.',confirmLabel:'Cancelar renovação'}))return
    setBusy(true)
    const result=await api('/api/admin/subscription/cancel-renewal',{method:'POST',body:JSON.stringify({confirmed:true})})
    setBusy(false)
    if(!result.ok){setError(result.error.message);return}
    notify('Renovação automática cancelada.','success');setRetry(value=>value+1)
  }
  return (
    <section
      className={`billing-shell staff52-billing ${locked ? 'billing-shell--locked' : ''}`}
      aria-labelledby="billing-title"
    >
      <div className="billing-intro">
        <div>
          <h2 id="billing-title">Plano da barbearia</h2>
          <p>
            Uma assinatura para a equipe, agenda por profissional e um WhatsApp
            do espaço. O valor é mensal por faixa de profissionais.
          </p>
        </div>
      </div>
      <div className="billing-layout">
        <div
          className="billing-plan-grid"
          role="radiogroup"
          aria-label="Faixa de profissionais"
        >
          {plans.map((plan) => (
            <button
              type="button"
              role="radio"
              aria-checked={plan.code === code}
              className={`billing-plan ${plan.code === code ? 'is-selected' : ''}`}
              key={plan.code}
              onClick={() => setCode(plan.code)}
              disabled={busy}
            >
              <span className="billing-plan__top">
                <strong>{plan.label}</strong>
              </span>
              <span className="billing-plan__monthly">
                <b>{money(plan.amountCents)}</b>
                <small>/mês</small>
              </span>
              <span className="billing-plan__total">
                Até {plan.seats} profissionais agendáveis
              </span>
              {catalog?.currentSubscription?.planCode===plan.code ? <span className="billing-plan__current">Plano atual</span> : null}
            </button>
          ))}
        </div>
        <aside className="card billing-summary" data-tour="billing-summary">
          <h3>{active ? catalog?.currentSubscription?.planCode === selected.code ? 'Seu plano atual' : 'Faixa selecionada' : 'Resumo da contratação'}</h3>
          <p>{selected.label}</p>
          <div className="billing-summary__price">
            <strong>{money(finalAmount)}</strong>
            <span>por um mês</span>
          </div>
          {quote?.debtRecoveryPercent ? <p role="status">{quote.debtRecoveryPercent}% dos créditos compensam benefícios de indicações estornadas. O restante entra no desconto mostrado; o desconto mostrado vale para a primeira mensalidade.</p> : null}
          {quote && quote.discountPercent > 0 ? <p role="status">{quote.discountPercent}% de desconto {quote.source === 'REFERRAL' ? 'pela indicação, na primeira assinatura' : 'com seus créditos de indicação'}. Valor normal da faixa: {money(selected.amountCents)}/mês. Créditos excedentes ficam para renovações futuras.</p> : null}
          <p>
            {active ? 'Você já tem uma assinatura ativa.' : 'Assinatura mensal com renovação automática no cartão. Cancele a renovação no painel.'}
          </p>
          {active ? (
            <p role="status">
              {catalog?.currentSubscription?.currentPeriodEnd
                ? `Seu período atual vai até ${new Date(catalog.currentSubscription.currentPeriodEnd).toLocaleDateString('pt-BR')}. `
                : ''}
              Para trocar de faixa durante este período, peça ajuda ao suporte.
            </p>
          ) : tooSmall ? (
            <p role="status">
              Esta faixa comporta menos profissionais do que os{' '}
              {catalog?.activeProfessionals} ativos no espaço.
            </p>
          ) : null}
          {error ? <p role="alert">{error}</p> : null}
          {active&&(catalog?.currentSubscription?.recurring||catalog?.recurringStatus==='ACTIVE')?<><p role="status">{catalog?.recurringStatus==='ACTIVE'?'Renovação mensal automática no cartão.':'Renovação automática cancelada. Seu período pago continua disponível.'}</p>{catalog?.recurringStatus==='ACTIVE'?<button type="button" className="btn btnSecondary" disabled={busy} onClick={()=>void cancelRenewal()}>Cancelar renovação automática</button>:null}</>:null}
          {!active&&catalog?.checkoutAvailable?<div className="billing-recurring-consent">{!catalog.billingIdentityComplete?<label>CPF ou CNPJ<input inputMode="numeric" maxLength={18} value={taxId} onChange={event=>setTaxId(formatTaxId(event.target.value))} placeholder="Documento do responsável" /></label>:null}<label><input type="checkbox" checked={recurringAccepted} onChange={event=>setRecurringAccepted(event.target.checked)} />Autorizo a renovação mensal automática no cartão, até cancelar no painel.</label></div>:null}
          {!loading && !active && !catalog?.checkoutAvailable ? (
            <p role="status">
              Contratação temporariamente indisponível. Os planos e valores
              continuam atualizados.
            </p>
          ) : null}
          {!active && catalog?.checkoutAvailable ? <button
            type="button"
            className="btn btnPrimary billing-checkout"
            disabled={
              loading ||
              busy ||
              !catalog?.checkoutAvailable ||
              tooSmall ||
              active
            }
            onClick={() => void startTeamCheckout()}
          >
            {loading
              ? 'Verificando disponibilidade…'
              : busy
                ? 'Preparando checkout…'
                : !catalog?.checkoutAvailable
                  ? 'Contratação indisponível'
                  : active ? 'Assinatura ativa' : 'Continuar para pagamento'}
          </button> : null}
          {active ? <a className="btn btn-ghost billing-help" href="/admin?view=support">Quero ajuda com meu plano</a> : null}
          {!loading && error ? (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setRetry((value) => value + 1)}
            >
              Tentar novamente
            </button>
          ) : null}
        </aside>
      </div>
      {!active && catalog?.checkoutAvailable ? <div
        className={`billing-mobile-cta ${active ? 'is-active-subscription' : ''}`}
        aria-label={`Plano selecionado: ${selected.label}`}
      >
        <div>
          <small>{selected.label}</small>
          <strong>{money(finalAmount)} agora</strong>
        </div>
        <button
          type="button"
          disabled={
            loading || busy || !catalog?.checkoutAvailable || tooSmall || active
          }
          onClick={() => void startTeamCheckout()}
        >
          {loading
            ? 'Verificando…'
            : busy
              ? 'Preparando…'
              : !catalog?.checkoutAvailable
                ? 'Indisponível'
                : active
                  ? 'Plano ativo'
                  : 'Continuar'}
        </button>
      </div> : null}
      {!locked && orders.length ? (
        <div className="billing-history">
          <div>
            <span className="eyebrow">Histórico</span>
            <h2>Pagamentos recentes</h2>
          </div>
          <div className="billing-history__list">
            {orders.slice(0, 10).map((order) => (
              <div key={order.orderNsu}>
                <span>
                  {new Date(order.createdAt).toLocaleDateString('pt-BR')}
                </span>
                <strong>{money(order.amountCents)}</strong>
                <em data-status={order.status}>
                  {order.status === 'PAID'
                    ? 'Pago'
                    : order.status === 'PENDING'
                      ? 'Pendente'
                      : order.status}
                </em>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  )
}
