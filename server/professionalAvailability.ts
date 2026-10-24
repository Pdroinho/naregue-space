import type Database from 'better-sqlite3'
import { getZonedDateTimeParts } from './dateTime.js'

type AvailabilityDb = Pick<Database.Database, 'prepare'>

export type AvailableProfessional = {
  id: string
  name: string
  nickname: string | null
  color: string
  photoUrl: string | null
}

export function findAvailableProfessional(db: AvailabilityDb, input: {
  tenantId: string
  serviceId: string
  startsAt: Date
  endsAt: Date
  timeZone: string
  preferredProfessionalId?: string | null
}) {
  const local = getZonedDateTimeParts(input.startsAt, input.timeZone)
  const localEnd = getZonedDateTimeParts(input.endsAt, input.timeZone)
  if (!local || !localEnd || local.ymd !== localEnd.ymd) return undefined

  const startMinute = local.hour * 60 + local.minute
  const endMinute = localEnd.hour * 60 + localEnd.minute
  const preferredSql = input.preferredProfessionalId ? 'AND p.id = ?' : ''
  const params: unknown[] = [
    input.tenantId,
    input.serviceId,
    local.weekday,
    startMinute,
    endMinute,
    local.weekday,
    startMinute,
    endMinute,
    input.startsAt.toISOString(),
    input.endsAt.toISOString(),
    input.startsAt.toISOString(),
    input.endsAt.toISOString(),
  ]
  if (input.preferredProfessionalId) params.push(input.preferredProfessionalId)

  return db.prepare(`
    SELECT p.id, p.name, p.nickname, p.color, p.photo_url as photoUrl
    FROM professionals p
    JOIN professional_services ps
      ON ps.professional_id = p.id AND ps.tenant_id = p.tenant_id
    WHERE p.tenant_id = ?
      AND p.active = 1
      AND ps.service_id = ?
      AND (
        (p.inherits_hours = 1 AND EXISTS (
          SELECT 1 FROM business_hours h
          WHERE h.tenant_id = p.tenant_id AND h.weekday = ?
            AND h.start_minute <= ? AND h.end_minute >= ?
        ))
        OR
        (p.inherits_hours = 0 AND EXISTS (
          SELECT 1 FROM professional_hours h
          WHERE h.tenant_id = p.tenant_id AND h.professional_id = p.id AND h.weekday = ?
            AND h.start_minute <= ? AND h.end_minute >= ?
        ))
      )
      AND NOT EXISTS (
        SELECT 1 FROM appointments a
        WHERE a.tenant_id = p.tenant_id AND a.professional_id = p.id
          AND a.status IN ('PENDING', 'CONFIRMED')
          AND NOT (a.ends_at <= ? OR a.starts_at >= ?)
      )
      AND NOT EXISTS (
        SELECT 1 FROM time_off t
        WHERE t.tenant_id = p.tenant_id
          AND (t.professional_id IS NULL OR t.professional_id = p.id)
          AND NOT (t.ends_at <= ? OR t.starts_at >= ?)
      )
      ${preferredSql}
    ORDER BY p.sort_order ASC, p.created_at ASC
    LIMIT 1
  `).get(...params) as AvailableProfessional | undefined
}
