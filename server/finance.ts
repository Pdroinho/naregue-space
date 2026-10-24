import { getDb } from './db.js'
import { getZonedDateTimeParts, monthBoundsUtc, shiftYearMonth } from './dateTime.js'

const db = getDb()

export type FinanceMonthSnapshot = {
  ym: string
  serviceEntriesCents: number
  manualIncomeCents: number
  entriesCents: number
  expensesCents: number
  balanceCents: number
  confirmedAppointments: number
}

export function tenantFinanceTimeZone(tenantId: string) {
  const row = db.prepare(`SELECT timezone FROM tenant_settings WHERE tenant_id = ?`).get(tenantId) as { timezone?: string } | undefined
  return row?.timezone || 'America/Sao_Paulo'
}

export function financeMonthSnapshot(input: { tenantId: string; timeZone: string; year: number; month: number; professionalId?: string | null }): FinanceMonthSnapshot {
  const bounds = monthBoundsUtc({ timeZone: input.timeZone, year: input.year, month: input.month })
  const startIso = bounds.start.toISOString()
  const endIso = bounds.endExclusive.toISOString()

  const services = db.prepare(`
    SELECT
      COALESCE(SUM(COALESCE(a.booked_price_cents,s.price_cents)), 0) AS serviceEntriesCents,
      COUNT(a.id) AS confirmedAppointments
    FROM appointments a
    JOIN services s ON s.id = a.service_id
    WHERE a.tenant_id = ?
      AND a.status != 'CANCELLED' AND (a.status = 'CONFIRMED' OR a.confirmation_status IN ('CONFIRMED','MANUALLY_CONFIRMED'))
      AND a.starts_at >= ?
      AND a.starts_at < ?
      AND (? IS NULL OR a.professional_id = ?)
  `).get(input.tenantId, startIso, endIso, input.professionalId ?? null, input.professionalId ?? null) as { serviceEntriesCents?: number; confirmedAppointments?: number } | undefined

  const cash = db.prepare(`
    SELECT
      COALESCE(SUM(CASE WHEN type = 'INCOME' THEN amount_cents ELSE 0 END), 0) AS manualIncomeCents,
      COALESCE(SUM(CASE WHEN type = 'EXPENSE' THEN amount_cents ELSE 0 END), 0) AS expensesCents
    FROM cash_transactions
    WHERE tenant_id = ?
      AND created_at >= ?
      AND created_at < ?
      AND (? IS NULL OR professional_id = ?)
  `).get(input.tenantId, startIso, endIso, input.professionalId ?? null, input.professionalId ?? null) as { manualIncomeCents?: number; expensesCents?: number } | undefined

  const serviceEntriesCents = Number(services?.serviceEntriesCents ?? 0)
  const manualIncomeCents = Number(cash?.manualIncomeCents ?? 0)
  const entriesCents = serviceEntriesCents + manualIncomeCents
  const expensesCents = Number(cash?.expensesCents ?? 0)

  return {
    ym: `${input.year}-${String(input.month).padStart(2, '0')}`,
    serviceEntriesCents,
    manualIncomeCents,
    entriesCents,
    expensesCents,
    balanceCents: entriesCents - expensesCents,
    confirmedAppointments: Number(services?.confirmedAppointments ?? 0),
  }
}

export function financeRecentMonths(input: { tenantId: string; timeZone: string; months?: number; now?: Date; professionalId?: string | null }) {
  const now = input.now ?? new Date()
  const parts = getZonedDateTimeParts(now, input.timeZone)
  if (!parts) return []
  const months = Math.max(1, Math.min(input.months ?? 6, 24))
  return Array.from({ length: months }, (_, index) => {
    const shifted = shiftYearMonth({ year: parts.year, month: parts.month }, index - (months - 1))
    return financeMonthSnapshot({ tenantId: input.tenantId, timeZone: input.timeZone, professionalId: input.professionalId, ...shifted })
  })
}

export function financeExpenseCategories(input: { tenantId: string; timeZone: string; year: number; month: number; limit?: number; professionalId?: string | null }) {
  const bounds = monthBoundsUtc({ timeZone: input.timeZone, year: input.year, month: input.month })
  const rows = db.prepare(`
    SELECT
      COALESCE(NULLIF(TRIM(method), ''), 'Outros') AS label,
      COALESCE(SUM(amount_cents), 0) AS amountCents,
      COUNT(*) AS transactions
    FROM cash_transactions
    WHERE tenant_id = ?
      AND type = 'EXPENSE'
      AND created_at >= ?
      AND created_at < ?
      AND (? IS NULL OR professional_id = ?)
    GROUP BY COALESCE(NULLIF(TRIM(method), ''), 'Outros')
    ORDER BY amountCents DESC
    LIMIT ?
  `).all(
    input.tenantId,
    bounds.start.toISOString(),
    bounds.endExclusive.toISOString(),
    input.professionalId ?? null,
    input.professionalId ?? null,
    Math.max(1, Math.min(input.limit ?? 5, 20)),
  ) as Array<{ label: string; amountCents: number; transactions: number }>

  return rows.map((row) => ({
    label: row.label,
    amountCents: Number(row.amountCents ?? 0),
    transactions: Number(row.transactions ?? 0),
  }))
}
