import assert from 'node:assert/strict'
import test from 'node:test'
import { DatabaseSync } from 'node:sqlite'
import { ensureProfessionalTeamSchema } from './professionalsMigration.ts'

function legacyDb() {
  const db = new DatabaseSync(':memory:')
  db.exec(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE tenants (id TEXT PRIMARY KEY, name TEXT NOT NULL, created_at TEXT NOT NULL);
    CREATE TABLE users (
      id TEXT PRIMARY KEY,
      tenant_id TEXT,
      email TEXT NOT NULL,
      role TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    );
    CREATE TABLE services (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      name TEXT NOT NULL,
      active INTEGER NOT NULL DEFAULT 1,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    );
    CREATE TABLE appointments (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      service_id TEXT NOT NULL,
      starts_at TEXT NOT NULL,
      ends_at TEXT NOT NULL,
      status TEXT NOT NULL,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
      FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE
    );
    CREATE TABLE time_off (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      starts_at TEXT NOT NULL,
      ends_at TEXT NOT NULL,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    );
    CREATE TABLE cash_transactions (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      amount_cents INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    );

    INSERT INTO tenants VALUES ('t1', 'Barbearia Central', '2026-01-01T00:00:00Z');
    INSERT INTO tenants VALUES ('t2', 'Barbearia Norte', '2026-01-02T00:00:00Z');
    INSERT INTO users VALUES ('u1', 't1', 'rafa.silva@example.com', 'ADMIN', '2026-01-01T00:00:00Z');
    INSERT INTO users VALUES ('u2', 't2', 'norte@example.com', 'ADMIN', '2026-01-02T00:00:00Z');
    INSERT INTO services VALUES ('s1', 't1', 'Corte', 1);
    INSERT INTO services VALUES ('s2', 't1', 'Serviço pausado', 0);
    INSERT INTO services VALUES ('s3', 't2', 'Barba', 1);
    INSERT INTO appointments VALUES ('a1', 't1', 's1', '2026-08-25T12:00:00Z', '2026-08-25T12:30:00Z', 'CONFIRMED');
    INSERT INTO appointments VALUES ('a2', 't2', 's3', '2026-08-25T13:00:00Z', '2026-08-25T13:30:00Z', 'CONFIRMED');
    INSERT INTO time_off VALUES ('b1', 't1', '2026-08-26T12:00:00Z', '2026-08-26T13:00:00Z');
    INSERT INTO cash_transactions VALUES ('c1', 't1', 5000, '2026-08-25T13:00:00Z');
  `)
  return db
}

test('migration 39 preserves legacy operation and creates one default professional per space', () => {
  const db = legacyDb()
  ensureProfessionalTeamSchema(db)

  const professionals = db.prepare(`SELECT id, tenant_id tenantId, name FROM professionals ORDER BY tenant_id`).all()
  assert.equal(professionals.length, 2)
  assert.equal(professionals[0].name, 'Rafa Silva')
  assert.equal(db.prepare(`SELECT COUNT(*) count FROM professional_services`).get().count, 2)
  assert.equal(db.prepare(`SELECT COUNT(*) count FROM professional_services WHERE service_id = 's2'`).get().count, 0)

  const firstAppointment = db.prepare(`SELECT professional_id professionalId FROM appointments WHERE id = 'a1'`).get()
  assert.equal(firstAppointment.professionalId, professionals[0].id)
  assert.equal(db.prepare(`SELECT professional_id professionalId FROM time_off WHERE id = 'b1'`).get().professionalId, null)
  assert.equal(db.prepare(`SELECT professional_id professionalId FROM cash_transactions WHERE id = 'c1'`).get().professionalId, null)
})

test('team schema rejects missing or cross-space professional references', () => {
  const db = legacyDb()
  ensureProfessionalTeamSchema(db)
  const professionalT1 = db.prepare(`SELECT id FROM professionals WHERE tenant_id = 't1'`).get().id
  const professionalT2 = db.prepare(`SELECT id FROM professionals WHERE tenant_id = 't2'`).get().id

  assert.throws(() => db.prepare(`INSERT INTO appointments (id, tenant_id, service_id, starts_at, ends_at, status, professional_id) VALUES ('bad-a', 't1', 's1', '2026-08-27T12:00:00Z', '2026-08-27T12:30:00Z', 'CONFIRMED', NULL)`).run())
  assert.throws(() => db.prepare(`INSERT INTO professional_services (tenant_id, professional_id, service_id, created_at) VALUES ('t1', ?, 's1', '2026-08-25T00:00:00Z')`).run(professionalT2))
  assert.throws(() => db.prepare(`INSERT INTO professional_hours (id, tenant_id, professional_id, weekday, start_minute, end_minute, created_at) VALUES ('bad-h', 't1', ?, 1, 540, 1080, '2026-08-25T00:00:00Z')`).run(professionalT2))
  assert.throws(() => db.prepare(`INSERT INTO time_off (id, tenant_id, starts_at, ends_at, professional_id) VALUES ('bad-b', 't1', '2026-08-27T12:00:00Z', '2026-08-27T13:00:00Z', ?)`).run(professionalT2))
  assert.throws(() => db.prepare(`INSERT INTO cash_transactions (id, tenant_id, amount_cents, created_at, professional_id) VALUES ('bad-c', 't1', 5000, '2026-08-25T00:00:00Z', ?)`).run(professionalT2))

  db.prepare(`INSERT INTO professional_hours (id, tenant_id, professional_id, weekday, start_minute, end_minute, created_at) VALUES ('ok-h', 't1', ?, 1, 540, 1080, '2026-08-25T00:00:00Z')`).run(professionalT1)
  assert.equal(db.prepare(`SELECT COUNT(*) count FROM professional_hours`).get().count, 1)
})

test('database guards prevent double booking and blocks over active appointments', () => {
  const db = legacyDb()
  ensureProfessionalTeamSchema(db)
  const professionalT1 = db.prepare(`SELECT id FROM professionals WHERE tenant_id = 't1'`).get().id

  assert.throws(() => db.prepare(`INSERT INTO appointments (id, tenant_id, service_id, starts_at, ends_at, status, professional_id) VALUES ('overlap', 't1', 's1', '2026-08-25T12:10:00Z', '2026-08-25T12:40:00Z', 'PENDING', ?)`).run(professionalT1))
  assert.throws(() => db.prepare(`INSERT INTO time_off (id, tenant_id, starts_at, ends_at, professional_id) VALUES ('overlap-block', 't1', '2026-08-25T12:10:00Z', '2026-08-25T12:40:00Z', ?)`).run(professionalT1))

  db.prepare(`INSERT INTO appointments (id, tenant_id, service_id, starts_at, ends_at, status, professional_id) VALUES ('cancelled-overlap', 't1', 's1', '2026-08-25T12:10:00Z', '2026-08-25T12:40:00Z', 'CANCELLED', ?)`).run(professionalT1)
  assert.equal(db.prepare(`SELECT COUNT(*) count FROM appointments WHERE id = 'cancelled-overlap'`).get().count, 1)
})
