import assert from 'node:assert/strict'
import test from 'node:test'
import Database from 'better-sqlite3'
import { getPublicBookingConfig, listPublicAvailableSlots, listPublicProfessionals, listPublicServices } from './publicBooking.js'

function fixture() {
  const db = new Database(':memory:')
  db.exec(`
    CREATE TABLE tenant_settings (tenant_id TEXT PRIMARY KEY, timezone TEXT NOT NULL, currency TEXT NOT NULL);
    CREATE TABLE booking_rules (tenant_id TEXT PRIMARY KEY, min_notice_minutes INTEGER NOT NULL, max_future_days INTEGER NOT NULL, slot_step_minutes INTEGER NOT NULL);
    CREATE TABLE services (id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, name TEXT NOT NULL, duration_minutes INTEGER NOT NULL, price_cents INTEGER NOT NULL, cover_url TEXT, active INTEGER NOT NULL, created_at TEXT NOT NULL);
    CREATE TABLE professionals (id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, name TEXT NOT NULL, nickname TEXT, phone TEXT, email TEXT, color TEXT NOT NULL, photo_url TEXT, active INTEGER NOT NULL, inherits_hours INTEGER NOT NULL, sort_order INTEGER NOT NULL, created_at TEXT NOT NULL);
    CREATE TABLE professional_services (tenant_id TEXT NOT NULL, professional_id TEXT NOT NULL, service_id TEXT NOT NULL);
    CREATE TABLE business_hours (tenant_id TEXT NOT NULL, weekday INTEGER NOT NULL, start_minute INTEGER NOT NULL, end_minute INTEGER NOT NULL);
    CREATE TABLE professional_hours (tenant_id TEXT NOT NULL, professional_id TEXT NOT NULL, weekday INTEGER NOT NULL, start_minute INTEGER NOT NULL, end_minute INTEGER NOT NULL);
    CREATE TABLE appointments (tenant_id TEXT NOT NULL, professional_id TEXT NOT NULL, status TEXT NOT NULL, starts_at TEXT NOT NULL, ends_at TEXT NOT NULL);
    CREATE TABLE time_off (tenant_id TEXT NOT NULL, professional_id TEXT, starts_at TEXT NOT NULL, ends_at TEXT NOT NULL);
  `)
  db.prepare(`INSERT INTO tenant_settings VALUES ('tenant-1', 'UTC', 'BRL')`).run()
  db.prepare(`INSERT INTO booking_rules VALUES ('tenant-1', 0, 60, 30)`).run()
  db.prepare(`INSERT INTO services VALUES ('service-1', 'tenant-1', 'Corte', 30, 5000, '/cover.webp', 1, '2026-01-01T00:00:00.000Z')`).run()
  db.prepare(`INSERT INTO professionals VALUES ('professional-1', 'tenant-1', 'Ana', 'Aninha', '+5511999999999', 'ana@example.com', '#347a8a', '/ana.webp', 1, 1, 0, '2026-01-01T00:00:00.000Z')`).run()
  db.prepare(`INSERT INTO professional_services VALUES ('tenant-1', 'professional-1', 'service-1')`).run()
  db.prepare(`INSERT INTO business_hours VALUES ('tenant-1', 2, 540, 660)`).run()
  return db
}

test('public professional projection never includes private contact or admin metadata', () => {
  const db = fixture()
  try {
    const [professional] = listPublicProfessionals(db, 'tenant-1')
    assert.deepEqual(Object.keys(professional).sort(), ['color', 'id', 'inheritsHours', 'name', 'nickname', 'photoUrl', 'serviceIds'].sort())
    assert.equal('phone' in professional, false)
    assert.equal('email' in professional, false)
    assert.equal('createdAt' in professional, false)
    assert.equal('updatedAt' in professional, false)
  } finally {
    db.close()
  }
})

test('public services use the same complete projection including coverUrl', () => {
  const db = fixture()
  try {
    assert.deepEqual(listPublicServices(db, 'tenant-1'), [{
      id: 'service-1',
      name: 'Corte',
      durationMinutes: 30,
      priceCents: 5000,
      coverUrl: '/cover.webp',
    }])
  } finally {
    db.close()
  }
})

test('booking config exposes public professionals and working ranges only', () => {
  const db = fixture()
  try {
    const config = getPublicBookingConfig(db, 'tenant-1')
    assert.equal(config.timezone, 'UTC')
    assert.equal(config.professionals[0]?.name, 'Ana')
    assert.equal('phone' in (config.professionals[0] ?? {}), false)
    assert.deepEqual(config.professionalHours, [{ professionalId: 'professional-1', weekday: 2, startMinute: 540, endMinute: 660 }])
  } finally {
    db.close()
  }
})

test('availability returns reservable slots instead of internal schedule blocks', () => {
  const db = fixture()
  try {
    db.prepare(`INSERT INTO appointments VALUES ('tenant-1', 'professional-1', 'CONFIRMED', '2026-08-25T09:30:00.000Z', '2026-08-25T10:00:00.000Z')`).run()
    db.prepare(`INSERT INTO time_off VALUES ('tenant-1', NULL, '2026-08-25T10:30:00.000Z', '2026-08-25T11:00:00.000Z')`).run()
    const slots = listPublicAvailableSlots(db, {
      tenantId: 'tenant-1',
      date: '2026-08-25',
      serviceId: 'service-1',
      now: new Date('2026-08-25T08:00:00.000Z'),
    })
    assert.deepEqual(slots, ['09:00', '10:00'])
  } finally {
    db.close()
  }
})
