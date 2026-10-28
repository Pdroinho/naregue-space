import { logger } from './logger.js'
import { createHash, createHmac, timingSafeEqual } from 'node:crypto'
import type Database from 'better-sqlite3'
import { Router } from 'express'
import { env } from './env.js'
import type { createPaymentWebhookRuntime } from './paymentWebhookRuntime.js'

// Published by AbacatePay. This public integrity key is not authentication;
// the installation-specific secret below is required as well.
export const ABACATEPAY_PUBLIC_KEY = 't9dXRhHHo3yDEj5pVDYz0frf7q6bMKyMRmxxCPIPp3RCplBfXRxqlC6ZpiWmOqj4L63qEaeUOtrCI8P0VMUgo6iIga2ri9ogaHFs0WIIywSMg0q7RmBfybe1E5XJcfC4IW3alNqym0tXoAKkzvfEjZxV6bE0oG2zJrNNYmUCKZyV0KZ3JS8Votf9EAWWYdiDkMkpbMdPggfh1EqHlVkMiTady6jOR3hyzGEHrIz2Ret0xHKMbiqkr9HS1JhNHDX9'
export function secureEqual(a: string, b: string) {
  const left = Buffer.from(a), right = Buffer.from(b)
  return left.length === right.length && timingSafeEqual(left, right)
}
export function validAbacatepaySignature(raw: Buffer, signature: string) {
  return secureEqual(createHmac('sha256', ABACATEPAY_PUBLIC_KEY).update(raw).digest('base64'), signature)
}

export function createAbacatepayWebhookRouter(db: Database.Database, runtime: ReturnType<typeof createPaymentWebhookRuntime> | null) {
  const router = Router()
  router.post('/abacatepay', (req, res, next) => {
    try {
      if (!runtime || !env.ABACATEPAY_WEBHOOK_SECRET) { res.status(503).json({ received: false }); return }
      const raw = (req as typeof req & { rawBody?: Buffer }).rawBody
      if (typeof req.query.webhookSecret !== 'string' || !secureEqual(req.query.webhookSecret, env.ABACATEPAY_WEBHOOK_SECRET) ||
        !raw || !validAbacatepaySignature(raw, req.get('x-webhook-signature') ?? '')) {
        res.status(401).json({ received: false }); return
      }
      const body = req.body as { id?: unknown; event?: unknown; devMode?: unknown; data?: { checkout?: { id?: unknown };subscription?:{id?:unknown;updatedAt?:unknown} } }
      if (typeof body.id !== 'string' || body.id.length > 200 || body.devMode !== env.ABACATEPAY_DEV_MODE) {
        res.status(400).json({ received: false }); return
      }
      const event = typeof body.event === 'string' ? body.event : ''
      if(['subscription.completed','subscription.renewed','subscription.cancelled','subscription.payment_failed','subscription.plan_changed'].includes(event)) {
        const subscriptionId=body.data?.subscription?.id
        if(typeof subscriptionId!=='string'||!subscriptionId.startsWith('subs_')||subscriptionId.length>200){res.status(400).json({received:false});return}
        const hash=createHash('sha256').update(raw).digest('hex')
        const existing=db.prepare('SELECT payload_hash AS hash FROM abacatepay_subscription_events WHERE id=?').get(body.id) as {hash:string}|undefined
        if(existing&&existing.hash!==hash){res.status(409).json({received:false});return}
        if(!existing)db.prepare('INSERT INTO abacatepay_subscription_events(id,subscription_id,event_type,payload_hash,occurred_at,received_at) VALUES(?,?,?,?,?,?)').run(body.id,subscriptionId,event,hash,typeof body.data?.subscription?.updatedAt==='string'?body.data.subscription.updatedAt:null,new Date().toISOString())
        res.json({received:true});queueMicrotask(()=>{void runtime.processPending().catch(error=>logger.error('payments.subscription_worker_failed',{error}))});return
      }
      const events: Record<string, string> = { 'checkout.completed': 'order_paid', 'checkout.refunded': 'order_refund', 'checkout.disputed': 'order_chargeback_in_treatment', 'checkout.lost': 'order_chargeback_in_treatment' }
      if (!events[event]) { res.json({ received: true, ignored: true }); return }
      const checkoutId = body.data?.checkout?.id
      if (typeof checkoutId !== 'string') { res.status(400).json({ received: false }); return }
      const local = db.prepare('SELECT id FROM abacatepay_checkouts WHERE provider_id=?').get(checkoutId) as { id: number } | undefined
      if (!local) { res.status(503).json({ received: false }); return }
      // Durable inbox write happens before acknowledgement. Worker rechecks the
      // authenticated provider API; neither a signature nor a payload grants access.
      const hash = createHash('sha256').update(raw).digest('hex')
      const existing = db.prepare('SELECT payload_hash h FROM abacatepay_webhook_events WHERE event_id=?').get(body.id) as {h:string}|undefined
      if (existing && existing.h !== hash) { res.status(409).json({received:false});return }
      if (!existing) db.transaction(()=>{
        db.prepare('INSERT INTO abacatepay_webhook_events(event_id,event_type,checkout_id,payload_hash,received_at) VALUES(?,?,?,?,?)')
          .run(body.id,event,local.id,hash,new Date().toISOString())
        if(event !== 'checkout.completed') db.prepare('UPDATE abacatepay_checkouts SET reversal_event=? WHERE id=?').run(event,local.id)
        runtime.receive({ event: events[event], event_type: 'order', data: { order_id: local.id, payment_link_id: local.id } })
      }).immediate()
      res.json({ received: true })
      queueMicrotask(() => { void runtime.processPending().catch(error=>logger.error('payments.webhook_worker_failed',{error})) })
    } catch (error) { next(error) }
  })
  return router
}
