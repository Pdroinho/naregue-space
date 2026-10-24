import { useCallback, useEffect, useState } from 'react'
import { api } from '../api'
import type { BillingPlan } from '../commercial'
import { writeStorage } from '../storage'
import { notify } from './FeedbackCenter'

type BillingOverview = {
  plans: BillingPlan[]
  subscription: null | { status: string; currentPeriodEnd: string | null; billingCycle?: string }
  orders: Array<{ orderNsu: string; amountCents: number; status: string; createdAt: string; paidAt: string | null }>
  referralDiscountPercent?: number
  firstMonthPromoEligible?: boolean
  firstMonthPromoCents?: number
}

const money = (cents: number) => (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export function BillingCenter({ locked = false }: { locked?: boolean }) {
  const [overview, setOverview] = useState<BillingOverview | null>(null)
  const [selected, setSelected] = useState<BillingPlan['cycle']>('ANNUAL')
  const [loading, setLoading] = useState(true)
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  const loadOverview = useCallback(() => {
    setLoading(true)
    setLoadError(null)
    api<BillingOverview>('/api/admin/billing/overview').then((res) => {
      if (res.ok) {
        setOverview(res.data)
        const featured = res.data.plans.find((plan) => plan.featured)
        if (featured) setSelected(featured.cycle)
      } else setLoadError(res.error.message)
    }).finally(() => setLoading(false))
  }, [])

  useEffect(() => { loadOverview() }, [loadOverview])

  async function startCheckout() {
    setCheckoutLoading(true)
    try {
      const result = await api<{ url: string; orderNsu: string }>('/api/admin/subscription/checkout-url', {
        method: 'POST',
        body: JSON.stringify({ cycle: selected }),
      })
      if (!result.ok) throw new Error(result.error.message)
      writeStorage('naregua:pending-order', result.data.orderNsu)
      window.location.assign(result.data.url)
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Não foi possível iniciar o pagamento.', 'error')
    } finally {
      setCheckoutLoading(false)
    }
  }



  if (loadError && !overview) return <div className="billing-shell"><div className="billing-error" role="alert"><strong>Não foi possível abrir a assinatura.</strong><span>{loadError}</span><button type="button" className="btn" onClick={loadOverview}>Tentar novamente</button></div></div>
  if (loading || !overview) return <div className="billing-shell"><div className="billing-loading skeleton skeleton-card" /></div>
  if (overview.plans.length === 0) return <div className="billing-shell"><div className="billing-error" role="alert"><strong>Nenhum plano disponível.</strong><span>Revise o catálogo de cobrança antes de iniciar um checkout.</span></div></div>
  const plan = overview.plans.find((item) => item.cycle === selected) ?? overview.plans[0]
  const referralDiscountPercent = overview.referralDiscountPercent ?? 0
  const discountedAmount = Math.max(0, plan.amountCents - Math.round(plan.amountCents * referralDiscountPercent / 100))
  const firstMonthPromoCents = overview.firstMonthPromoCents ?? null
  const promoAmount = overview.firstMonthPromoEligible && plan.cycle === 'MONTHLY' && firstMonthPromoCents !== null ? firstMonthPromoCents : null
  const finalAmount = promoAmount !== null ? Math.min(discountedAmount, promoAmount) : discountedAmount

  return (
    <section className={`billing-shell ${locked ? 'billing-shell--locked' : ''}`} aria-labelledby="billing-title">
      <div className="billing-intro">
        <div>
          <span className="eyebrow">Assinatura NaRégua Pro</span>
          <h1 id="billing-title">Escolha o ritmo que acompanha o seu negócio</h1>
          <p>Pague com Pix ou cartão no checkout seguro. O acesso é liberado automaticamente após a confirmação.</p>{overview.firstMonthPromoEligible && firstMonthPromoCents !== null ? <small className="billing-promo-copy"><strong>Novas contas no mensal:</strong> 1º mês por {money(firstMonthPromoCents)} e depois {money(overview.plans.find((item) => item.cycle === 'MONTHLY')?.amountCents ?? plan.amountCents)}/mês.</small> : null}
        </div>
        <div className="billing-trust" aria-label="Informações do pagamento">
          <span>Checkout InfinitePay</span><span>Pix</span><span>Cartão até 12x</span>
        </div>
      </div>

      <div className="billing-layout">
        <div className="billing-plan-grid" role="radiogroup" aria-label="Ciclo de cobrança">
          {overview.plans.map((item) => (
            <button
              type="button"
              key={item.cycle}
              role="radio"
              aria-checked={selected === item.cycle}
              className={`billing-plan ${selected === item.cycle ? 'is-selected' : ''} ${item.featured ? 'is-featured' : ''}`}
              onClick={() => setSelected(item.cycle)}
            >
              <span className="billing-plan__top"><strong>{item.label}</strong>{item.featured ? <em>Melhor valor</em> : overview.firstMonthPromoEligible && item.cycle === 'MONTHLY' && firstMonthPromoCents !== null ? <em>1º mês {money(firstMonthPromoCents)}</em> : null}</span>
              <span className="billing-plan__monthly"><b>{money(item.monthlyEquivalentCents)}</b><small>/mês</small></span>
              <span className="billing-plan__total">{overview.firstMonthPromoEligible && item.cycle === 'MONTHLY' && firstMonthPromoCents !== null ? `1ª cobrança de ${money(firstMonthPromoCents)}` : `Cobrança de ${money(item.amountCents)}`}</span>
              {item.savingsPercent > 0 ? <span className="billing-plan__saving">Economize {item.savingsPercent}%</span> : <span className="billing-plan__saving is-muted">Mais flexibilidade</span>}
            </button>
          ))}
        </div>

        <aside className="billing-summary">
          <span className="eyebrow">Resumo</span>
          <h2>{plan.label}</h2>
          <div className="billing-summary__price"><strong>{money(finalAmount)}</strong><span>por {plan.months === 1 ? 'mês' : `${plan.months} meses`}</span></div>
          {promoAmount !== null && promoAmount <= discountedAmount ? <div className="billing-referral-credit"><strong>Promo de boas-vindas aplicada</strong><span>Depois, o mensal volta para {money(plan.amountCents)}.</span></div> : referralDiscountPercent > 0 ? <div className="billing-referral-credit"><strong>{referralDiscountPercent}% de crédito aplicado</strong><span>Valor original: {money(plan.amountCents)}</span></div> : null}
          <ul>
            <li>Agenda, clientes, financeiro e link público</li>
            <li>Domínio personalizado e WhatsApp</li>
            <li>Atualizações e suporte da plataforma</li>
            <li>Mestre AI quando habilitado no plano</li>
          </ul>
          <button type="button" className="btn btnPrimary billing-checkout" onClick={startCheckout} disabled={checkoutLoading}>
            {checkoutLoading ? 'Abrindo checkout seguro…' : `Continuar com ${plan.label.toLowerCase()}`}
          </button>
          <p className="billing-legal">A InfinitePay coleta os dados do pagamento. A NaRégua não armazena número completo do cartão.</p>

        </aside>
      </div>

      <div className="billing-mobile-cta" aria-label={`Plano selecionado: ${plan.label}`}>
        <div><small>{plan.label} selecionado</small><strong>{money(finalAmount)}{plan.months === 1 ? '/mês' : ` / ${plan.months} meses`}</strong></div>
        <button type="button" onClick={startCheckout} disabled={checkoutLoading}>
          {checkoutLoading ? 'Abrindo…' : 'Continuar'}
        </button>
      </div>

      {!locked && overview.orders.length > 0 ? (
        <div className="billing-history">
          <div><span className="eyebrow">Histórico</span><h2>Pagamentos recentes</h2></div>
          <div className="billing-history__list">
            {overview.orders.slice(0, 6).map((order) => <div key={order.orderNsu}><span>{new Date(order.createdAt).toLocaleDateString('pt-BR')}</span><strong>{money(order.amountCents)}</strong><em data-status={order.status}>{order.status === 'PAID' ? 'Pago' : order.status === 'PENDING' ? 'Pendente' : 'Falhou'}</em></div>)}
          </div>
        </div>
      ) : null}
    </section>
  )
}
