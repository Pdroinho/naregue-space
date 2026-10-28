import { createHash, randomUUID } from 'node:crypto'
import type Database from 'better-sqlite3'

const API = 'https://api.abacatepay.com/v2'
export class PaymentRequestError extends Error {
  constructor(message: string, public status: number, public permissionDenied = false) { super(`${message} (HTTP ${status})`) }
}
type Options = { db: Database.Database; apiKey: string; devMode: boolean; appBaseUrl: string; fetchFn?: typeof fetch }
type Checkout = { id: string; externalId: string; amount: number; paidAmount: number | null; status: string; devMode: boolean; url: string }
type LocalCheckout = { id: number; providerId: string; externalId: string; amountCents: number; reversalEvent: string | null }
export type PaymentCustomer = { name?: string; email: string; cellphone?: string }
export type PaymentLinkInput = { name: string; amountCents: number; description: string; checkoutIntentId?: string; catalogKey?: string; productName?: string; customer?: PaymentCustomer }

/** Provider IDs stay strings. Numeric IDs below are local database keys only. */
export function createPaymentClient({ db, apiKey, devMode, appBaseUrl, fetchFn = fetch }: Options) {
  const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex')
  // Credentials never leave the server; separate merchant credentials and test/live catalogs.
  const scope = hash([apiKey, devMode])
  let customerPermissionWarning = false
  async function request<T>(path: string, body?: unknown): Promise<T> {
    let response: Response
    try {
      response = await fetchFn(`${API}${path}`, {
        method: body === undefined ? 'GET' : 'POST', redirect: 'error',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(12_000), ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      })
    } catch { throw new PaymentRequestError('Não foi possível confirmar a resposta da AbacatePay. Consulte o pedido antes de tentar novamente.', 0) }
    const envelope = await response.json().catch(() => null) as { success?: boolean; data?: T; error?: unknown } | null
    if (!response.ok || envelope?.success !== true || !envelope.data) {
      // Do not expose credentials, customer data or upstream payloads to logs/UI.
      const permissionDenied = response.status === 403 && envelope?.error === 'Insufficient permissions'
      throw new PaymentRequestError('A AbacatePay não confirmou a operação.', response.status, permissionDenied)
    }
    return envelope.data
  }
  function load(id: number) {
    return db.prepare('SELECT id,provider_id as providerId,external_id as externalId,amount_cents as amountCents,reversal_event as reversalEvent FROM abacatepay_checkouts WHERE id=?')
      .get(id) as LocalCheckout | undefined
  }
  async function inspect(local: LocalCheckout): Promise<Checkout> {
    if (!local.providerId) throw new PaymentRequestError('Checkout ainda não confirmado pelo provedor.', 0)
    const data = await request<Checkout>(`/checkouts/get?id=${encodeURIComponent(local.providerId)}`)
    if (data.id !== local.providerId || data.externalId !== local.externalId || data.devMode !== devMode || data.amount !== local.amountCents) {
      throw new PaymentRequestError('A cobrança retornada não corresponde ao pedido e ao ambiente esperado.', 0)
    }
    db.prepare('UPDATE abacatepay_checkouts SET status=?,updated_at=? WHERE id=?').run(data.status, new Date().toISOString(), local.id)
    return data
  }
  async function catalogProduct(input: PaymentLinkInput) {
    const key = hash([scope, input.catalogKey ?? input.description, input.amountCents, 'BRL', 'ONE_TIME'])
    const externalId = `naregua-${devMode ? 'sandbox-' : ''}catalog-${key}`
    const reserved = db.transaction(() => {
      const existing = db.prepare('SELECT provider_id AS id FROM abacatepay_catalog WHERE cache_key=?').get(key) as { id: string | null } | undefined
      if (existing) {
        if (!existing.id) throw new PaymentRequestError('O produto ainda está em conferência. Solicite revisão antes de tentar novamente.', 0)
        return existing.id
      }
      db.prepare('INSERT INTO abacatepay_catalog(cache_key,external_id,created_at) VALUES(?,?,?)').run(key, externalId, new Date().toISOString())
      return null
    }).immediate()
    if (reserved) return reserved
    try {
      const product = await request<{ id: string }>('/products/create', { externalId, name: input.productName ?? input.description, description: input.description, price: input.amountCents, currency: 'BRL' })
      if (typeof product.id !== 'string' || !product.id) throw new PaymentRequestError('Produto do checkout inválido.', 0)
      db.prepare('UPDATE abacatepay_catalog SET provider_id=? WHERE cache_key=?').run(product.id, key)
      return product.id
    } catch (error) {
      // Unknown outcomes keep the reservation: never duplicate a product after a timeout.
      if (error instanceof PaymentRequestError && error.status >= 400 && error.status < 500 && ![408,409,429].includes(error.status)) db.prepare('DELETE FROM abacatepay_catalog WHERE cache_key=? AND provider_id IS NULL').run(key)
      throw error
    }
  }
  async function checkoutCustomer(customer?: PaymentCustomer) {
    if (!customer) return undefined
    const profile = { email: customer.email.trim().toLowerCase(), ...(customer.name?.trim() ? { name: customer.name.trim() } : {}), ...(customer.cellphone ? { cellphone: customer.cellphone } : {}) }
    const key = hash([scope, profile])
    const saved = db.prepare('SELECT provider_id AS id FROM abacatepay_customers WHERE cache_key=?').get(key) as { id: string } | undefined
    if (saved) return saved.id
    let created: { id: string; devMode: boolean }
    try {
      created = await request<{ id: string; devMode: boolean }>('/customers/create', profile)
    } catch (error) {
      // Prefill is optional. A restricted key must not disable otherwise working checkout.
      if (!(error instanceof PaymentRequestError) || !error.permissionDenied) throw error
      if (!customerPermissionWarning) console.warn('AbacatePay: CUSTOMER:CREATE permission required for checkout prefill; continuing with hosted customer entry.')
      customerPermissionWarning = true
      return undefined
    }
    if (typeof created.id !== 'string' || !created.id || created.devMode !== devMode) throw new PaymentRequestError('Cliente de pagamento incompatível com o ambiente.', 0)
    db.prepare('INSERT OR IGNORE INTO abacatepay_customers(cache_key,provider_id,created_at) VALUES(?,?,?)').run(key, created.id, new Date().toISOString())
    return created.id
  }
  async function createPaymentLink(input: PaymentLinkInput) {
    if (!Number.isSafeInteger(input.amountCents) || input.amountCents < 100) throw new PaymentRequestError('Valor de cobrança inválido.', 400)
    const externalId = `naregua-${devMode ? 'sandbox-' : ''}${randomUUID()}`, now = new Date().toISOString()
    const result = db.prepare('INSERT INTO abacatepay_checkouts(external_id,amount_cents,created_at,updated_at) VALUES(?,?,?,?)')
      .run(externalId, input.amountCents, now, now)
    const localId = Number(result.lastInsertRowid)
    const customerId = await checkoutCustomer(input.customer)
    const productId = await catalogProduct(input)
    db.prepare('UPDATE abacatepay_checkouts SET product_id=? WHERE id=?').run(productId, localId)
    const data = await request<Checkout>('/checkouts/create', {
      items: [{ id: productId, quantity: 1 }], methods: ['PIX', 'CARD'], externalId,
      ...(customerId ? { customerId } : {}),
      returnUrl: `${appBaseUrl.replace(/\/$/, '')}/login`,
      completionUrl: input.checkoutIntentId ? `${appBaseUrl.replace(/\/$/, '')}/api/public/onboarding/checkout-return?intent=${encodeURIComponent(input.checkoutIntentId)}` : `${appBaseUrl.replace(/\/$/, '')}/?checkout=return`,
      metadata: { application: 'naregua', localCheckoutId: String(localId) },
    })
    const url = new URL(data.url)
    if (url.protocol !== 'https:' || url.hostname !== 'app.abacatepay.com' || url.username || url.password ||
      typeof data.id !== 'string' || !data.id || data.externalId !== externalId || data.amount !== input.amountCents || data.devMode !== devMode) {
      throw new PaymentRequestError('A AbacatePay retornou um checkout incompatível.', 0)
    }
    db.prepare('UPDATE abacatepay_checkouts SET provider_id=?,status=?,checkout_url=?,updated_at=? WHERE id=?')
      .run(data.id, data.status, url.toString(), new Date().toISOString(), localId)
    return { linkId: localId, checkoutUrl: url.toString() }
  }
  async function inspectPaymentLinkOrder(input: { linkId: number; orderId: number; expectedAmountCents: number }): Promise<'PAID' | 'REVERSED' | 'UNKNOWN'> {
    const local = load(input.linkId)
    if (!local || input.orderId !== local.id || local.amountCents !== input.expectedAmountCents) return 'UNKNOWN'
    const checkout = await inspect(local)
    if (local.reversalEvent || ['REFUNDED', 'DISPUTED', 'LOST', 'CHARGEBACK'].includes(checkout.status)) return 'REVERSED'
    return checkout.status === 'PAID' && checkout.paidAmount === input.expectedAmountCents ? 'PAID' : 'UNKNOWN'
  }
  async function listPaymentLinkOrders(id: number) {
    const local = load(id)
    if (!local) return []
    const checkout = await inspect(local)
    return [{ id, status: checkout.status }]
  }
  return { createPaymentLink, inspectPaymentLinkOrder, listPaymentLinkOrders,
    verifyPaymentLinkOrder: async (input: Parameters<typeof inspectPaymentLinkOrder>[0]) => (await inspectPaymentLinkOrder(input)) === 'PAID' }
}
