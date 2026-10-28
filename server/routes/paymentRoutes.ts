import type Database from 'better-sqlite3'
import { Router } from 'express'
import { z } from 'zod'
import { requireRole } from '../auth.js'
import { badRequest, forbidden, notFound } from '../http.js'
import { TEAM_PLANS } from '../teamPlans.js'
import type { createPaymentBillingService } from '../paymentBillingService.js'
import { encryptSecret } from '../secretCrypto.js'
import { validTaxId } from '../taxId.js'

type Billing = ReturnType<typeof createPaymentBillingService>

export function createAdminPaymentRouter(db: Database.Database, billing: Billing | null, enabled: boolean, production: boolean) {
  const router = Router()
  router.get('/subscription/team-plans', requireRole('ADMIN'), (req, res) => {
    const tenantId = req.sessionUser!.tenantId!
    const subscription = db.prepare(`SELECT plan_code as planCode, current_period_end as currentPeriodEnd FROM subscriptions
      WHERE tenant_id = ? AND status = 'ACTIVE' AND current_period_end > ? LIMIT 1`).get(tenantId, new Date().toISOString()) as { planCode: string; currentPeriodEnd: string } | undefined
    const activeCount = db.prepare(`SELECT count(*) as count FROM professionals WHERE tenant_id = ? AND active = 1 AND bookable = 1`).get(tenantId) as { count: number }
    const recurring=db.prepare("SELECT c.subscription_status AS status FROM abacatepay_checkouts c JOIN subscriptions s ON s.external_id='payment:'||c.id WHERE s.tenant_id=? AND c.frequency='SUBSCRIPTION'").get(tenantId) as {status:string}|undefined
    const identity=db.prepare("SELECT billing_tax_id_enc AS taxId FROM users WHERE tenant_id=? AND role='ADMIN' ORDER BY created_at,id LIMIT 1").get(tenantId) as {taxId:string|null}|undefined
    res.json({ quotes: billing ? Object.fromEntries(TEAM_PLANS.map(plan => [plan.code,billing.quoteForTenant(tenantId,plan.code)])) : {}, plans: TEAM_PLANS, checkoutAvailable: enabled && Boolean(billing), activeProfessionals: activeCount.count,
      orders: db.prepare('SELECT id as orderNsu, amount_cents as amountCents, status, created_at as createdAt, paid_at as paidAt FROM payment_checkout_intents WHERE tenant_id = ? ORDER BY created_at DESC LIMIT 10').all(tenantId),
      currentSubscription: subscription ? {...subscription,recurring:Boolean(recurring),autoRenew:recurring?.status==='ACTIVE'} : null,recurringStatus:recurring?.status??null, billingIdentityComplete:Boolean(identity?.taxId),provider: 'ABACATEPAY', interval: 'MONTHLY', recurring: true })
  })
  router.post('/subscription/team-checkout', requireRole('ADMIN'), async (req, res, next) => {
    try {
      if (!enabled || !billing) throw badRequest('O checkout AbacatePay ainda não foi habilitado.', 'PAYMENT_CHECKOUT_DISABLED')
      const tenantId = req.sessionUser?.tenantId
      if (!tenantId) throw forbidden('Espaço inválido.', 'INVALID_TENANT')
      if (production && req.resolvedTenant?.id !== tenantId) throw forbidden('Use o endereço do seu espaço.', 'TENANT_HOST_REQUIRED')
      const { planCode,taxId,recurringAccepted } = z.object({ planCode: z.enum(['TEAM_3', 'TEAM_6', 'TEAM_15']),taxId:z.string().max(18).refine(validTaxId).optional(),recurringAccepted:z.literal(true) }).strict().parse(req.body)
      if(!recurringAccepted)throw badRequest('Confirme a renovação mensal automática.')
      if(taxId)db.prepare("UPDATE users SET billing_tax_id_enc=? WHERE tenant_id=? AND role='ADMIN' AND id=?").run(encryptSecret(taxId.replace(/\D/g,''),`billing:${tenantId}`),tenantId,req.sessionUser!.id)
      const activeCount = db.prepare(`SELECT count(*) as count FROM professionals WHERE tenant_id = ? AND active = 1 AND bookable = 1`).get(tenantId) as { count: number }
      const plan = TEAM_PLANS.find(item => item.code === planCode)!
      if (activeCount.count > plan.seats) throw badRequest('A equipe ativa excede as vagas desta faixa.', 'TEAM_PLAN_TOO_SMALL')
      const checkout = await billing.startCheckout(tenantId, planCode)
      res.json(checkout)
    } catch (error) { next(error) }
  })
  router.post('/subscription/cancel-renewal',requireRole('ADMIN'),async(req,res,next)=>{
    try{
      if(!billing)throw badRequest('Assinatura indisponível.')
      const tenantId=req.sessionUser!.tenantId!
      if(production&&req.resolvedTenant?.id!==tenantId)throw forbidden('Use o endereço do seu espaço.','TENANT_HOST_REQUIRED')
      z.object({confirmed:z.literal(true)}).strict().parse(req.body)
      res.json(await billing.cancelRecurring(tenantId))
    }catch(error){next(error)}
  })
  router.get('/subscription/team-order/:id', requireRole('ADMIN'), (req, res, next) => {
    try {
      const tenantId = req.sessionUser?.tenantId
      const id = z.string().uuid().parse(req.params.id)
      const order = db.prepare(`SELECT status, plan_code as planCode, amount_cents as amountCents, paid_at as paidAt
        FROM payment_checkout_intents WHERE tenant_id = ? AND id = ?`).get(tenantId, id)
      if (!order) throw notFound('Pedido não encontrado.', 'ORDER_NOT_FOUND')
      res.json({ order })
    } catch (error) { next(error) }
  })
  return router
}
