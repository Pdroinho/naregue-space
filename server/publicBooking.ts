import type Database from 'better-sqlite3'
import { getZonedDateTimeParts, parseYmd, utcForLocalTime } from './dateTime.js'
import { badRequest, notFound } from './http.js'
import { findAvailableProfessional } from './professionalAvailability.js'

type PublicBookingDb = Pick<Database.Database, 'prepare'>

export type PublicProfessional = {
  id: string
  name: string
  nickname: string | null
  color: string
  photoUrl: string | null
  inheritsHours: boolean
  serviceIds: string[]
}

export type PublicService = {
  id: string
  name: string
  durationMinutes: number
  priceCents: number
  coverUrl: string | null
}

export type PublicBookingConfig = {
  timezone: string
  currency: string
  bookingRules: {
    minNoticeMinutes: number
    maxFutureDays: number
    slotStepMinutes: number
  }
  professionals: PublicProfessional[]
  professionalHours: Array<{
    professionalId: string
    weekday: number
    startMinute: number
    endMinute: number
  }>
}

export function resolveActiveTenantBySlug(db: PublicBookingDb, rawSlug: string) {
  const slug = rawSlug.trim().toLowerCase()
  if (!slug) throw badRequest('Espaço inválido', 'INVALID_TENANT_SLUG')
  return db.prepare("SELECT id FROM tenants WHERE slug = ? AND status = 'ACTIVE' LIMIT 1").get(slug) as
    | { id: string }
    | undefined
}

export function listPublicServices(db: PublicBookingDb, tenantId: string): PublicService[] {
  return db.prepare(`
    SELECT id, name, duration_minutes as durationMinutes, price_cents as priceCents, cover_url as coverUrl
    FROM services
    WHERE tenant_id = ? AND active = 1
    ORDER BY created_at DESC
  `).all(tenantId) as PublicService[]
}

export function listPublicProfessionals(db: PublicBookingDb, tenantId: string): PublicProfessional[] {
  const rows = db.prepare(`
    SELECT id, name, nickname, color, photo_url as photoUrl, inherits_hours as inheritsHours
    FROM professionals
    WHERE tenant_id = ? AND active = 1
    ORDER BY sort_order ASC, name COLLATE NOCASE ASC
  `).all(tenantId) as Array<{
    id: string
    name: string
    nickname: string | null
    color: string
    photoUrl: string | null
    inheritsHours: number
  }>
  const links = db.prepare(`
    SELECT professional_id as professionalId, service_id as serviceId
    FROM professional_services
    WHERE tenant_id = ?
  `).all(tenantId) as Array<{ professionalId: string; serviceId: string }>
  const serviceIds = new Map<string, string[]>()
  for (const link of links) serviceIds.set(link.professionalId, [...(serviceIds.get(link.professionalId) ?? []), link.serviceId])
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    nickname: row.nickname,
    color: row.color,
    photoUrl: row.photoUrl,
    inheritsHours: Boolean(row.inheritsHours),
    serviceIds: serviceIds.get(row.id) ?? [],
  }))
}

export function getPublicBookingConfig(db: PublicBookingDb, tenantId: string): PublicBookingConfig {
  const settings = db.prepare(`
    SELECT timezone, currency
    FROM tenant_settings
    WHERE tenant_id = ?
  `).get(tenantId) as { timezone: string; currency: string } | undefined
  const bookingRules = db.prepare(`
    SELECT min_notice_minutes as minNoticeMinutes,
           max_future_days as maxFutureDays,
           slot_step_minutes as slotStepMinutes
    FROM booking_rules
    WHERE tenant_id = ?
  `).get(tenantId) as PublicBookingConfig['bookingRules'] | undefined
  const professionalHours = db.prepare(`
    SELECT p.id as professionalId, h.weekday, h.start_minute as startMinute, h.end_minute as endMinute
    FROM professionals p
    JOIN business_hours h ON h.tenant_id = p.tenant_id
    WHERE p.tenant_id = ? AND p.active = 1 AND p.inherits_hours = 1
    UNION ALL
    SELECT p.id as professionalId, h.weekday, h.start_minute as startMinute, h.end_minute as endMinute
    FROM professionals p
    JOIN professional_hours h ON h.tenant_id = p.tenant_id AND h.professional_id = p.id
    WHERE p.tenant_id = ? AND p.active = 1 AND p.inherits_hours = 0
    ORDER BY professionalId, weekday, startMinute
  `).all(tenantId, tenantId) as PublicBookingConfig['professionalHours']

  return {
    timezone: settings?.timezone ?? 'America/Sao_Paulo',
    currency: settings?.currency ?? 'BRL',
    bookingRules: bookingRules ?? { minNoticeMinutes: 60, maxFutureDays: 60, slotStepMinutes: 15 },
    professionals: listPublicProfessionals(db, tenantId),
    professionalHours,
  }
}

function calendarDayNumber(ymd: string) {
  const parsed = parseYmd(ymd)
  if (!parsed) throw badRequest('Data inválida', 'INVALID_DATE')
  return Math.floor(Date.UTC(parsed.year, parsed.month - 1, parsed.day) / 86_400_000)
}

export function listPublicAvailableSlots(db: PublicBookingDb, input: {
  tenantId: string
  date: string
  serviceId: string
  professionalId?: string | null
  now?: Date
}) {
  const service = db.prepare(`
    SELECT id, duration_minutes as durationMinutes
    FROM services
    WHERE id = ? AND tenant_id = ? AND active = 1
    LIMIT 1
  `).get(input.serviceId, input.tenantId) as { id: string; durationMinutes: number } | undefined
  if (!service) throw notFound('Serviço não encontrado', 'SERVICE_NOT_FOUND')
  if (!Number.isInteger(service.durationMinutes) || service.durationMinutes <= 0) {
    throw badRequest('Duração do serviço inválida', 'INVALID_SERVICE_DURATION')
  }

  const config = getPublicBookingConfig(db, input.tenantId)
  const now = input.now ?? new Date()
  const localNow = getZonedDateTimeParts(now, config.timezone)
  if (!localNow) throw badRequest('Fuso horário inválido', 'INVALID_TIMEZONE')
  const requestedDay = calendarDayNumber(input.date)
  const today = calendarDayNumber(localNow.ymd)
  if (requestedDay < today || requestedDay - today > config.bookingRules.maxFutureDays) return []

  const parsedDate = parseYmd(input.date)
  if (!parsedDate) throw badRequest('Data inválida', 'INVALID_DATE')
  const middayUtc = utcForLocalTime({ timeZone: config.timezone, ...parsedDate, hour: 12, minute: 0 })
  const localDate = getZonedDateTimeParts(middayUtc, config.timezone)
  if (!localDate) throw badRequest('Data inválida', 'INVALID_DATE')

  const eligible = config.professionals.filter((professional) =>
    professional.serviceIds.includes(input.serviceId) && (!input.professionalId || professional.id === input.professionalId),
  )
  if (input.professionalId && eligible.length === 0) throw notFound('Profissional não encontrado para este serviço', 'PROFESSIONAL_NOT_FOUND')
  if (eligible.length === 0) return []

  const eligibleIds = new Set(eligible.map((professional) => professional.id))
  const ranges = config.professionalHours.filter((range) => eligibleIds.has(range.professionalId) && range.weekday === localDate.weekday)
  const candidates = new Set<number>()
  const stepMinutes = Math.max(5, config.bookingRules.slotStepMinutes)
  for (const range of ranges) {
    const lastStart = range.endMinute - service.durationMinutes
    for (let minute = range.startMinute; minute <= lastStart; minute += stepMinutes) candidates.add(minute)
  }

  const cutoff = new Date(now.getTime() + config.bookingRules.minNoticeMinutes * 60_000)
  const slots: string[] = []
  for (const minute of [...candidates].sort((a, b) => a - b)) {
    let startsAt: Date
    try {
      startsAt = utcForLocalTime({
        timeZone: config.timezone,
        ...parsedDate,
        hour: Math.floor(minute / 60),
        minute: minute % 60,
      })
    } catch {
      // Horários locais inexistentes durante a mudança de DST não são reserváveis.
      continue
    }
    if (startsAt < cutoff) continue
    const endsAt = new Date(startsAt.getTime() + service.durationMinutes * 60_000)
    if (!findAvailableProfessional(db, {
      tenantId: input.tenantId,
      serviceId: input.serviceId,
      startsAt,
      endsAt,
      timeZone: config.timezone,
      preferredProfessionalId: input.professionalId ?? null,
    })) continue
    slots.push(`${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`)
  }
  return slots
}
