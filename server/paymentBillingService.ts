import { createPaymentReferralService, referralQuoteFingerprint, type TeamQuote } from './paymentReferralService.js'
import { PaymentRequestError, type PaymentLinkInput, type RecurringState } from './payment.js'
import { decryptSecret } from './secretCrypto.js'
import { randomUUID } from 'node:crypto'
import type Database from 'better-sqlite3'
import { nextBillingPeriodEnd } from './plans.js'
import { badRequest } from './http.js'
import { isBillingRecoveryTenant } from './tenantRecovery.js'
import { teamPlanByCode, type TeamPlanCode } from './teamPlans.js'

type Link = { linkId: number; checkoutUrl: string }
type Provider = {
  isRecurring?:(id:number)=>boolean
  recurringState?:(id:number)=>Promise<RecurringState|null>
  recurringStateById?:(id:string)=>Promise<RecurringState|null>
  cancelRecurring?:(id:number)=>Promise<RecurringState>
  createPaymentLink: (input: PaymentLinkInput) => Promise<Link>
  verifyPaymentLinkOrder: (input: { linkId: number; orderId: number; expectedAmountCents: number }) => Promise<boolean>
  inspectPaymentLinkOrder?: (input: { linkId: number; orderId: number; expectedAmountCents: number }) => Promise<'PAID' | 'REVERSED' | 'UNKNOWN'>
  listPaymentLinkOrders?: (linkId: number) => Promise<Array<{ id: number; status: string }>>
}

type Intent = { id: string; tenantId: string; planCode: TeamPlanCode; amountCents: number; grossAmountCents: number; discountPercent: number; referralRedemptionId: string | null; paymentLinkId: number | null; checkoutUrl: string | null; status: string; orderId: number | null }

export function createPaymentBillingService(db: Database.Database, provider: Provider) {
  const referrals = createPaymentReferralService(db)
  function load(tenantId: string, id: string) {
    return db.prepare(`SELECT id, tenant_id as tenantId, plan_code as planCode, amount_cents as amountCents, gross_amount_cents as grossAmountCents, discount_percent as discountPercent, referral_redemption_id as referralRedemptionId,
      payment_link_id as paymentLinkId, checkout_url as checkoutUrl, status, order_id as orderId
      FROM payment_checkout_intents WHERE tenant_id = ? AND id = ?`).get(tenantId, id) as Intent | undefined
  }

  async function startCheckout(tenantId: string, code: TeamPlanCode, referralToken?: string, quoteFingerprint?: string) {
    const plan = teamPlanByCode(code)
    if (!plan) throw badRequest('Faixa inválida.', 'INVALID_TEAM_PLAN')
    if(provider.recurringState) {
      const renewing=db.prepare("SELECT c.id FROM abacatepay_checkouts c JOIN subscriptions s ON s.external_id='payment:'||c.id WHERE s.tenant_id=? AND c.frequency='SUBSCRIPTION' AND c.subscription_status='ACTIVE'").get(tenantId) as {id:number}|undefined
      if(renewing) {
        const state=await provider.recurringState(renewing.id)
        if(!state||state.status==='ACTIVE')throw badRequest('Já existe uma assinatura com renovação automática. Confira o pagamento ou cancele a renovação antes de contratar novamente.','ACTIVE_RECURRING_SUBSCRIPTION')
      }
    }
    const existing = db.transaction(() => {
      const tenant = db.prepare('SELECT name, status FROM tenants WHERE id = ?').get(tenantId) as { name: string; status: string } | undefined
      if (!tenant) throw new Error('Espaço não encontrado.')
      if (tenant.status !== 'ACTIVE' && tenant.status !== 'ONBOARDING' && !isBillingRecoveryTenant(db, tenantId, tenant.status)) {
        throw badRequest('Este espaço precisa de revisão pela administração da plataforma.', 'TENANT_PAYMENT_BLOCKED')
      }
      const active = db.prepare(`SELECT 1 FROM subscriptions WHERE tenant_id = ? AND status = 'ACTIVE' AND current_period_end > ? LIMIT 1`)
        .get(tenantId, new Date().toISOString())
      if (active) throw badRequest('A migração de uma assinatura ativa requer uma política de períodos pagos.', 'ACTIVE_SUBSCRIPTION_TRANSITION_REQUIRED')
      if (db.prepare("SELECT 1 FROM infinitepay_orders WHERE tenant_id = ? AND status = 'PENDING' LIMIT 1").get(tenantId)) throw badRequest('Existe uma compra anterior em andamento. Solicite conferência em Suporte antes de abrir outra cobrança.', 'CHECKOUT_IN_PROGRESS')
      const pending = db.prepare(`SELECT id FROM payment_checkout_intents WHERE tenant_id = ? AND status IN ('CREATING','PENDING') ORDER BY created_at DESC LIMIT 1`)
        .get(tenantId) as { id: string } | undefined
      if (pending) {
        const found = load(tenantId, pending.id)!
        if (found.status === 'CREATING' || found.planCode !== code || !found.checkoutUrl) throw badRequest(found.status === 'CREATING' ? 'A criação do pagamento ainda está em conferência. Abra um chamado em Suporte antes de tentar uma nova cobrança.' : 'Já existe uma compra em andamento para este espaço.', 'CHECKOUT_IN_PROGRESS')
        return { name: tenant.name, intent: found }
      }
      const id = randomUUID()
      const reserved = referrals.reserve(tenantId, id, plan.amountCents, referralToken,quoteFingerprint)
      db.prepare(`INSERT INTO payment_checkout_intents (id, tenant_id, plan_code, amount_cents, gross_amount_cents, discount_percent, referral_redemption_id, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'CREATING', ?)`).run(id, tenantId, code, reserved.quote.amountCents, plan.amountCents, reserved.quote.discountPercent, reserved.redemptionId, new Date().toISOString())
      referrals.reserveDebts(id,reserved.debts)
      return { name: tenant.name, intent: load(tenantId, id)! }
    }).immediate()
    if (existing.intent.status === 'PENDING') return { intentId: existing.intent.id, checkoutUrl: existing.intent.checkoutUrl! }

    try {
      const owner = db.prepare("SELECT billing_name AS name,billing_tax_id_enc AS taxId,email,phone AS cellphone FROM users WHERE tenant_id=? AND role='ADMIN' ORDER BY created_at,id LIMIT 1").get(tenantId) as { name: string | null; taxId:string|null; email: string; cellphone: string | null } | undefined
      const link = await provider.createPaymentLink({ name: existing.name, productName: `NaRégua · ${plan.label}`, catalogKey: `team:${plan.code}`, amountCents: existing.intent.amountCents, description: `NaRégua · ${plan.label} · um mês`, checkoutIntentId: existing.intent.id,
        cycle:'MONTHLY',renewalAmountCents:existing.intent.grossAmountCents,
        ...(owner ? { customer: { email: owner.email, ...(owner.name ? { name: owner.name } : {}), ...(owner.cellphone ? { cellphone: owner.cellphone } : {}), ...(owner.taxId?{taxId:decryptSecret(owner.taxId,`billing:${tenantId}`)}:{}) } } : {}),
      })
      const updated = db.prepare(`UPDATE payment_checkout_intents SET payment_link_id = ?, checkout_url = ?, status = 'PENDING'
        WHERE id = ? AND tenant_id = ? AND status = 'CREATING'`).run(link.linkId, link.checkoutUrl, existing.intent.id, tenantId)
      if (updated.changes !== 1) throw new Error('A intenção de pagamento mudou durante a criação do link.')
      return { intentId: existing.intent.id, checkoutUrl: link.checkoutUrl }
    } catch (error) {
      // A timeout/5xx may happen after the external link was created. Keep the
      // intent and reservations until reviewed; never create a second charge blindly.
      if (error instanceof PaymentRequestError && error.status >= 400 && error.status < 500 && error.status !== 408) db.transaction(() => {
        db.prepare(`UPDATE payment_checkout_intents SET status = 'FAILED' WHERE id = ? AND tenant_id = ? AND status = 'CREATING'`).run(existing.intent.id, tenantId)
        referrals.failed(tenantId,existing.intent.id)
      }).immediate()
      throw error
    }
  }

  async function confirmOrder(input: { tenantId: string; intentId: string; orderId: number }) {
    const intent = load(input.tenantId, input.intentId)
    if (!intent || !intent.paymentLinkId) return false
    if (intent.status === 'PAID') return intent.orderId === input.orderId
    if (intent.status !== 'PENDING') return false
    const confirmed = await provider.verifyPaymentLinkOrder({
      linkId: intent.paymentLinkId, orderId: input.orderId, expectedAmountCents: intent.amountCents,
    })
    if (!confirmed) return false
    const recurring=provider.isRecurring?.(intent.paymentLinkId)?await provider.recurringState?.(intent.paymentLinkId):null
    if(provider.isRecurring?.(intent.paymentLinkId)&&!recurring)return false
    return db.transaction(() => {
      const current = load(input.tenantId, input.intentId)
      if (!current || current.status !== 'PENDING' || current.paymentLinkId !== intent.paymentLinkId) return current?.status === 'PAID' && current.orderId === input.orderId
      const now = new Date().toISOString()
      const active = db.prepare(`SELECT 1 FROM subscriptions WHERE tenant_id = ? AND status = 'ACTIVE' AND current_period_end > ? LIMIT 1`).get(input.tenantId, now)
      if (active) throw new Error('Assinatura ativa detectada; conciliação manual necessária antes de aplicar o pagamento.')
      const periodEnd = nextBillingPeriodEnd(null, 1, new Date(recurring?.createdAt??now))
      if(recurring)db.prepare('UPDATE abacatepay_checkouts SET period_end=? WHERE id=?').run(periodEnd,intent.paymentLinkId)
      const updated = db.prepare(`UPDATE payment_checkout_intents SET status = 'PAID', order_id = ?, paid_at = ?
        WHERE tenant_id = ? AND id = ? AND status = 'PENDING'`).run(input.orderId, now, input.tenantId, input.intentId)
      if (updated.changes !== 1) return false
      const previous = db.prepare('SELECT id FROM subscriptions WHERE tenant_id = ?').get(input.tenantId) as { id: string } | undefined
      if (previous) db.prepare(`UPDATE subscriptions SET status = 'ACTIVE', plan_code = ?, billing_cycle = 'MONTHLY', current_period_end = ?, external_id = ?, updated_at = ? WHERE tenant_id = ?`)
        .run(intent.planCode, periodEnd, `payment:${input.orderId}`, now, input.tenantId)
      else db.prepare(`INSERT INTO subscriptions (id, tenant_id, external_id, status, current_period_end, billing_cycle, plan_code, created_at, updated_at)
        VALUES (?, ?, ?, 'ACTIVE', ?, 'MONTHLY', ?, ?, ?)`).run(randomUUID(), input.tenantId, `payment:${input.orderId}`, periodEnd, intent.planCode, now, now)
      db.prepare(`UPDATE tenants SET status = 'ACTIVE', suspension_reason = NULL WHERE id = ? AND (status = 'ONBOARDING' OR (status = 'SUSPENDED' AND suspension_reason = 'PAYMENT'))`).run(input.tenantId)
      referrals.paid(input.tenantId,input.intentId)
      return true
    }).immediate()
  }

  async function reconcileOrder(input: { tenantId: string; intentId: string; orderId: number }) {
    const intent = load(input.tenantId, input.intentId)
    if (!intent || !intent.paymentLinkId || intent.status === 'REFUNDED' ||
      (intent.status === 'PAID' && intent.orderId !== input.orderId) ||
      !['PENDING', 'PAID'].includes(intent.status) || !provider.inspectPaymentLinkOrder) return false
    const state = await provider.inspectPaymentLinkOrder({
      linkId: intent.paymentLinkId, orderId: input.orderId, expectedAmountCents: intent.amountCents,
    })
    if (state === 'PAID') return intent.status === 'PAID' || confirmOrder(input)
    if (state !== 'REVERSED') return false
    if(provider.isRecurring?.(intent.paymentLinkId))await provider.cancelRecurring?.(intent.paymentLinkId)
    return db.transaction(() => {
      const latest = load(input.tenantId, input.intentId)
      if (!latest || !['PENDING', 'PAID'].includes(latest.status) ||
        (latest.orderId !== null && latest.orderId !== input.orderId)) return false
      const now = new Date().toISOString()
      db.prepare("UPDATE payment_checkout_intents SET status = 'REFUNDED', order_id = ? WHERE id = ? AND tenant_id = ?")
        .run(input.orderId, input.intentId, input.tenantId)
      referrals.reversed(input.tenantId,input.intentId)
      if (latest.status === 'PAID') {
        // A newer paid order may own the current subscription. Never suspend it.
        const suspended = db.prepare("UPDATE subscriptions SET status = 'CANCELLED', updated_at = ? WHERE tenant_id = ? AND status = 'ACTIVE' AND external_id = ?")
          .run(now, input.tenantId, `payment:${input.orderId}`)
        if (suspended.changes) db.prepare("UPDATE tenants SET status = 'SUSPENDED', suspension_reason = 'PAYMENT' WHERE id = ? AND status = 'ACTIVE'").run(input.tenantId)
      }
      return true
    }).immediate()
  }

  async function reconcilePaidIntents() {
    if (!provider.inspectPaymentLinkOrder) return
    const rows = db.prepare(`SELECT id, tenant_id as tenantId, order_id as orderId
      FROM payment_checkout_intents WHERE status = 'PAID' AND order_id IS NOT NULL AND paid_at > ?
      ORDER BY coalesce(provider_checked_at, paid_at) ASC LIMIT 20`)
      .all(new Date(Date.now() - 60 * 86400_000).toISOString()) as Array<{ id: string; tenantId: string; orderId: number }>
    for (const row of rows) {
      try {
        await reconcileOrder({ tenantId: row.tenantId, intentId: row.id, orderId: row.orderId })
        db.prepare("UPDATE payment_checkout_intents SET provider_checked_at = ? WHERE id = ? AND status = 'PAID'")
          .run(new Date().toISOString(), row.id)
      } catch { /* Consulta falhou; mantém acesso e tenta novamente no próximo ciclo. */ }
    }
  }

  async function reconcileRecurringEvents() {
    if(!provider.recurringStateById)return
    const events=db.prepare("SELECT id,subscription_id AS subscriptionId,event_type AS eventType,occurred_at AS occurredAt,received_at AS receivedAt FROM abacatepay_subscription_events WHERE status='PENDING' ORDER BY received_at LIMIT 30").all() as Array<{id:string;subscriptionId:string;eventType:string;occurredAt:string|null;receivedAt:string}>
    for(const event of events) {
      try {
        const state=await provider.recurringStateById(event.subscriptionId)
        if(!state){db.prepare("UPDATE abacatepay_subscription_events SET status='IGNORED',processed_at=? WHERE id=?").run(new Date().toISOString(),event.id);continue}
        const intent=db.prepare("SELECT id,tenant_id AS tenantId,status FROM payment_checkout_intents WHERE payment_link_id=?").get(state.localId) as {id:string;tenantId:string;status:string}|undefined
        if(!intent)continue
        if(intent.status==='PENDING')await confirmOrder({tenantId:intent.tenantId,intentId:intent.id,orderId:state.localId})
        db.transaction(()=>{
          const current=load(intent.tenantId,intent.id)
          if(current?.status!=='PAID')return
          if(event.eventType==='subscription.renewed'&&state.status==='ACTIVE') {
            // A provider resend with a new event ID must never grant an extra month.
            // Use the subscription's original calendar anchor and the paid cycle date.
            if(!event.occurredAt){db.prepare("UPDATE abacatepay_subscription_events SET status='NEEDS_REVIEW',processed_at=? WHERE id=?").run(new Date().toISOString(),event.id);return}
            const occurred=new Date(event.occurredAt),anchor=new Date(state.createdAt)
            if(!Number.isFinite(occurred.getTime())||occurred.getTime()>Date.now()+300_000||occurred<anchor)throw new Error('Invalid paid cycle date')
            let months=(occurred.getUTCFullYear()-anchor.getUTCFullYear())*12+occurred.getUTCMonth()-anchor.getUTCMonth()
            if(months<1)months=0
            let cycleStart=months?new Date(nextBillingPeriodEnd(null,months,anchor)):anchor
            if(cycleStart>occurred&&months>0){months--;cycleStart=months?new Date(nextBillingPeriodEnd(null,months,anchor)):anchor}
            const periodEnd=nextBillingPeriodEnd(null,months+1,anchor)
            const now=new Date().toISOString()
            db.prepare("UPDATE subscriptions SET current_period_end=?,updated_at=? WHERE tenant_id=? AND external_id=? AND current_period_end<?").run(periodEnd,now,intent.tenantId,`payment:${state.localId}`,periodEnd)
            db.prepare('UPDATE abacatepay_checkouts SET period_end=CASE WHEN period_end<? THEN ? ELSE period_end END,last_renewed_cycle=? WHERE id=?').run(periodEnd,periodEnd,cycleStart.toISOString(),state.localId)
            db.prepare("UPDATE tenants SET status='ACTIVE',suspension_reason=NULL WHERE id=? AND status='SUSPENDED' AND suspension_reason='PAYMENT'").run(intent.tenantId)
          }
          // Cancellation/payment failure stops renewal, never discards already paid access.
          db.prepare("UPDATE abacatepay_subscription_events SET status='APPLIED',processed_at=? WHERE id=?").run(new Date().toISOString(),event.id)
        }).immediate()
      }catch{/* Durable pending event is retried; an unverified event never grants access. */}
    }
    if(provider.recurringState){
      const rows=db.prepare("SELECT c.id FROM abacatepay_checkouts c JOIN payment_checkout_intents i ON i.payment_link_id=c.id WHERE c.frequency='SUBSCRIPTION' AND i.status='PAID' ORDER BY c.updated_at LIMIT 20").all() as {id:number}[]
      for(const row of rows)try{await provider.recurringState(row.id)}catch{/* API outages do not revoke paid access. */}
    }
  }

  async function cancelRecurring(tenantId:string) {
    if(!provider.cancelRecurring)throw badRequest('Assinatura recorrente indisponível.')
    const row=db.prepare("SELECT i.payment_link_id AS linkId FROM payment_checkout_intents i JOIN subscriptions s ON s.tenant_id=i.tenant_id AND s.external_id='payment:'||i.payment_link_id JOIN abacatepay_checkouts c ON c.id=i.payment_link_id WHERE i.tenant_id=? AND c.frequency='SUBSCRIPTION' AND i.status='PAID'").get(tenantId) as {linkId:number}|undefined
    if(!row)throw badRequest('Nenhuma renovação automática encontrada.')
    await provider.cancelRecurring(row.linkId)
    return {cancelled:true}
  }

  async function reconcilePendingIntents() {
    if (!provider.listPaymentLinkOrders) return
    const intents = db.prepare(`SELECT id, tenant_id as tenantId, payment_link_id as paymentLinkId
      FROM payment_checkout_intents WHERE status = 'PENDING' AND payment_link_id IS NOT NULL AND created_at > ? ORDER BY created_at LIMIT 20`)
      .all(new Date(Date.now() - 30 * 86400_000).toISOString()) as Array<{ id: string; tenantId: string; paymentLinkId: number }>
    for (const intent of intents) {
      try {
        const orders = await provider.listPaymentLinkOrders(intent.paymentLinkId)
        for (const order of orders) {
          if (provider.inspectPaymentLinkOrder) {
            if (await reconcileOrder({ tenantId: intent.tenantId, intentId: intent.id, orderId: order.id })) break
          } else if (['aprovado', 'integrado'].includes(order.status.toLowerCase()) &&
            await confirmOrder({ tenantId: intent.tenantId, intentId: intent.id, orderId: order.id })) break
        }
      } catch { /* Retenta na próxima passagem; nunca libera acesso sem verificação. */ }
    }
  }

  function quoteForTenant(tenantId: string, code: TeamPlanCode): TeamQuote {
    const plan = teamPlanByCode(code)!
    const pending = db.prepare("SELECT id FROM payment_checkout_intents WHERE tenant_id = ? AND plan_code = ? AND status IN ('CREATING','PENDING') LIMIT 1").get(tenantId,code) as {id:string}|undefined
    if(pending){const intent=load(tenantId,pending.id)!;return {grossAmountCents:intent.grossAmountCents,amountCents:intent.amountCents,discountPercent:intent.discountPercent,discountAmountCents:intent.grossAmountCents-intent.amountCents,source:intent.referralRedemptionId?'REFERRAL':intent.discountPercent?'CREDITS':'NONE'}}
    return referrals.quote(tenantId,plan.amountCents).result
  }
  function publicQuote(code: TeamPlanCode, token?: string) {const quote=referrals.quote(null,teamPlanByCode(code)!.amountCents,token).result;return {...quote,fingerprint:referralQuoteFingerprint(quote,token)}}
  return { creditPreview: (tenantId:string) => referrals.creditPreview(tenantId), quoteForTenant, publicQuote, validateReferral: referrals.validateReferral, startCheckout, confirmOrder, reconcileOrder, reconcilePendingIntents, reconcilePaidIntents,reconcileRecurringEvents,cancelRecurring }
}
