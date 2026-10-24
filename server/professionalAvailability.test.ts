import assert from 'node:assert/strict'
import test from 'node:test'
import { DatabaseSync } from 'node:sqlite'
import { findAvailableProfessional } from './professionalAvailability.js'

function availabilityDb() {
  const db = new DatabaseSync(':memory:')
  db.exec(`
    CREATE TABLE professionals (
      id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, name TEXT NOT NULL, nickname TEXT,
      color TEXT NOT NULL, photo_url TEXT, active INTEGER NOT NULL,
      inherits_hours INTEGER NOT NULL, sort_order INTEGER NOT NULL, created_at TEXT NOT NULL
    );
    CREATE TABLE professional_services (tenant_id TEXT NOT NULL, professional_id TEXT NOT NULL, service_id TEXT NOT NULL);
    CREATE TABLE business_hours (tenant_id TEXT NOT NULL, weekday INTEGER NOT NULL, start_minute INTEGER NOT NULL, end_minute INTEGER NOT NULL);
    CREATE TABLE professional_hours (tenant_id TEXT NOT NULL, professional_id TEXT NOT NULL, weekday INTEGER NOT NULL, start_minute INTEGER NOT NULL, end_minute INTEGER NOT NULL);
    CREATE TABLE appointments (tenant_id TEXT NOT NULL, professional_id TEXT NOT NULL, starts_at TEXT NOT NULL, ends_at TEXT NOT NULL, status TEXT NOT NULL);
    CREATE TABLE time_off (tenant_id TEXT NOT NULL, professional_id TEXT, starts_at TEXT NOT NULL, ends_at TEXT NOT NULL);

    INSERT INTO professionals VALUES ('p1','t1','Rafa',NULL,'#347a8a',NULL,1,1,0,'2026-01-01T00:00:00Z');
    INSERT INTO professionals VALUES ('p2','t1','Davi','Dave','#a6463e',NULL,1,1,1,'2026-01-02T00:00:00Z');
    INSERT INTO professionals VALUES ('p3','t2','Outro',NULL,'#4d6570',NULL,1,1,0,'2026-01-01T00:00:00Z');
    INSERT INTO professional_services VALUES ('t1','p1','s1');
    INSERT INTO professional_services VALUES ('t1','p2','s1');
    INSERT INTO professional_services VALUES ('t1','p2','s2');
    INSERT INTO professional_services VALUES ('t2','p3','s1');
    INSERT INTO business_hours VALUES ('t1',2,540,1080);
    INSERT INTO business_hours VALUES ('t2',2,540,1080);
  `)
  return db
}

const slot = {
  tenantId: 't1',
  serviceId: 's1',
  startsAt: new Date('2026-08-25T13:00:00.000Z'),
  endsAt: new Date('2026-08-25T13:30:00.000Z'),
  timeZone: 'America/Bahia',
}

function find(db: DatabaseSync, input: Parameters<typeof findAvailableProfessional>[1]) {
  return findAvailableProfessional(db as unknown as Parameters<typeof findAvailableProfessional>[0], input)
}

test('next available distributes the same slot to the next eligible professional', () => {
  const db = availabilityDb()
  assert.equal(find(db, slot)?.id, 'p1')
  db.prepare(`INSERT INTO appointments VALUES ('t1','p1',?,?, 'CONFIRMED')`).run(slot.startsAt.toISOString(), slot.endsAt.toISOString())
  assert.equal(find(db, slot)?.id, 'p2')
})

test('specific choice, service eligibility and individual blocks are respected', () => {
  const db = availabilityDb()
  assert.equal(find(db, { ...slot, preferredProfessionalId: 'p2' })?.id, 'p2')
  assert.equal(find(db, { ...slot, serviceId: 's2' })?.id, 'p2')
  assert.equal(find(db, { ...slot, serviceId: 's2', preferredProfessionalId: 'p1' }), undefined)
  db.prepare(`INSERT INTO time_off VALUES ('t1','p2',?,?)`).run(slot.startsAt.toISOString(), slot.endsAt.toISOString())
  assert.equal(find(db, { ...slot, preferredProfessionalId: 'p2' }), undefined)
  assert.equal(find(db, slot)?.id, 'p1')
})

test('global blocks close the slot for the whole team', () => {
  const db = availabilityDb()
  db.prepare(`INSERT INTO time_off VALUES ('t1',NULL,?,?)`).run(slot.startsAt.toISOString(), slot.endsAt.toISOString())
  assert.equal(find(db, slot), undefined)
})

test('custom professional hours override the general schedule', () => {
  const db = availabilityDb()
  db.prepare(`UPDATE professionals SET inherits_hours = 0 WHERE id = 'p2'`).run()
  assert.equal(find(db, { ...slot, serviceId: 's2' }), undefined)
  db.prepare(`INSERT INTO professional_hours VALUES ('t1','p2',2,600,900)`).run()
  assert.equal(find(db, { ...slot, serviceId: 's2' })?.id, 'p2')
})
