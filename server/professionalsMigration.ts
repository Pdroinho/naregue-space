import { randomUUID } from 'node:crypto'
import type Database from 'better-sqlite3'

type MigrationDb = Pick<Database.Database, 'exec' | 'prepare'>

export function ensureProfessionalTeamSchema(db: MigrationDb) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS professionals (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      name TEXT NOT NULL,
      nickname TEXT,
      phone TEXT,
      email TEXT,
      color TEXT NOT NULL DEFAULT '#347a8a',
      photo_url TEXT,
      active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
      inherits_hours INTEGER NOT NULL DEFAULT 1 CHECK (inherits_hours IN (0, 1)),
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_professionals_tenant_active
      ON professionals(tenant_id, active, sort_order, created_at);

    CREATE TABLE IF NOT EXISTS professional_services (
      tenant_id TEXT NOT NULL,
      professional_id TEXT NOT NULL,
      service_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      PRIMARY KEY (professional_id, service_id),
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
      FOREIGN KEY (professional_id) REFERENCES professionals(id) ON DELETE CASCADE,
      FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_professional_services_tenant_service
      ON professional_services(tenant_id, service_id, professional_id);

    CREATE TABLE IF NOT EXISTS professional_hours (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      professional_id TEXT NOT NULL,
      weekday INTEGER NOT NULL CHECK (weekday BETWEEN 0 AND 6),
      start_minute INTEGER NOT NULL CHECK (start_minute BETWEEN 0 AND 1440),
      end_minute INTEGER NOT NULL CHECK (end_minute BETWEEN 0 AND 1440),
      created_at TEXT NOT NULL,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
      FOREIGN KEY (professional_id) REFERENCES professionals(id) ON DELETE CASCADE,
      CHECK (end_minute > start_minute)
    );
    CREATE INDEX IF NOT EXISTS idx_professional_hours_schedule
      ON professional_hours(tenant_id, professional_id, weekday, start_minute);

    ALTER TABLE appointments ADD COLUMN professional_id TEXT REFERENCES professionals(id) ON DELETE RESTRICT;
    ALTER TABLE time_off ADD COLUMN professional_id TEXT REFERENCES professionals(id) ON DELETE CASCADE;
    ALTER TABLE cash_transactions ADD COLUMN professional_id TEXT REFERENCES professionals(id) ON DELETE SET NULL;
  `)

  const now = new Date().toISOString()
  const tenants = db.prepare(`SELECT id FROM tenants ORDER BY created_at ASC`).all() as Array<{ id: string }>
  const firstAdmin = db.prepare(`SELECT email FROM users WHERE tenant_id = ? AND role = 'ADMIN' ORDER BY created_at ASC LIMIT 1`)
  const insertProfessional = db.prepare(`
    INSERT INTO professionals (id, tenant_id, name, color, active, inherits_hours, sort_order, created_at, updated_at)
    VALUES (?, ?, ?, '#347a8a', 1, 1, 0, ?, ?)
  `)
  const assignServices = db.prepare(`
    INSERT OR IGNORE INTO professional_services (tenant_id, professional_id, service_id, created_at)
    SELECT ?, ?, id, ? FROM services WHERE tenant_id = ? AND active = 1
  `)
  const assignAppointments = db.prepare(`UPDATE appointments SET professional_id = ? WHERE tenant_id = ? AND professional_id IS NULL`)

  for (const tenant of tenants) {
    const professionalId = randomUUID()
    const admin = firstAdmin.get(tenant.id) as { email?: string } | undefined
    const local = String(admin?.email ?? '').split('@')[0].replace(/[._-]+/g, ' ').trim()
    const name = local ? local.replace(/\b\p{L}/gu, (letter) => letter.toUpperCase()) : 'Profissional principal'
    insertProfessional.run(professionalId, tenant.id, name, now, now)
    assignServices.run(tenant.id, professionalId, now, tenant.id)
    assignAppointments.run(professionalId, tenant.id)
  }

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_appointments_tenant_professional_starts
      ON appointments(tenant_id, professional_id, starts_at);
    CREATE INDEX IF NOT EXISTS idx_time_off_tenant_professional_range
      ON time_off(tenant_id, professional_id, starts_at, ends_at);
    CREATE INDEX IF NOT EXISTS idx_cash_transactions_tenant_professional_created
      ON cash_transactions(tenant_id, professional_id, created_at);

    CREATE TRIGGER IF NOT EXISTS appointments_professional_required_insert
    BEFORE INSERT ON appointments
    WHEN NEW.professional_id IS NULL OR NOT EXISTS (
      SELECT 1 FROM professionals p
      WHERE p.id = NEW.professional_id AND p.tenant_id = NEW.tenant_id
    )
    BEGIN
      SELECT RAISE(ABORT, 'appointment professional is required');
    END;

    CREATE TRIGGER IF NOT EXISTS appointments_professional_required_update
    BEFORE UPDATE OF professional_id, tenant_id ON appointments
    WHEN NEW.professional_id IS NULL OR NOT EXISTS (
      SELECT 1 FROM professionals p
      WHERE p.id = NEW.professional_id AND p.tenant_id = NEW.tenant_id
    )
    BEGIN
      SELECT RAISE(ABORT, 'appointment professional is required');
    END;

    CREATE TRIGGER IF NOT EXISTS appointments_slot_guard_insert
    BEFORE INSERT ON appointments
    WHEN NEW.status IN ('PENDING', 'CONFIRMED') AND (
      EXISTS (
        SELECT 1 FROM appointments a
        WHERE a.tenant_id = NEW.tenant_id
          AND a.professional_id = NEW.professional_id
          AND a.status IN ('PENDING', 'CONFIRMED')
          AND NOT (a.ends_at <= NEW.starts_at OR a.starts_at >= NEW.ends_at)
      )
      OR EXISTS (
        SELECT 1 FROM time_off t
        WHERE t.tenant_id = NEW.tenant_id
          AND (t.professional_id IS NULL OR t.professional_id = NEW.professional_id)
          AND NOT (t.ends_at <= NEW.starts_at OR t.starts_at >= NEW.ends_at)
      )
    )
    BEGIN
      SELECT RAISE(ABORT, 'appointment slot unavailable');
    END;

    CREATE TRIGGER IF NOT EXISTS appointments_slot_guard_update
    BEFORE UPDATE OF tenant_id, professional_id, starts_at, ends_at, status ON appointments
    WHEN NEW.status IN ('PENDING', 'CONFIRMED') AND (
      EXISTS (
        SELECT 1 FROM appointments a
        WHERE a.id <> NEW.id
          AND a.tenant_id = NEW.tenant_id
          AND a.professional_id = NEW.professional_id
          AND a.status IN ('PENDING', 'CONFIRMED')
          AND NOT (a.ends_at <= NEW.starts_at OR a.starts_at >= NEW.ends_at)
      )
      OR EXISTS (
        SELECT 1 FROM time_off t
        WHERE t.tenant_id = NEW.tenant_id
          AND (t.professional_id IS NULL OR t.professional_id = NEW.professional_id)
          AND NOT (t.ends_at <= NEW.starts_at OR t.starts_at >= NEW.ends_at)
      )
    )
    BEGIN
      SELECT RAISE(ABORT, 'appointment slot unavailable');
    END;

    CREATE TRIGGER IF NOT EXISTS professional_services_tenant_guard_insert
    BEFORE INSERT ON professional_services
    WHEN NOT EXISTS (
      SELECT 1 FROM professionals p
      JOIN services s ON s.id = NEW.service_id
      WHERE p.id = NEW.professional_id
        AND p.tenant_id = NEW.tenant_id
        AND s.tenant_id = NEW.tenant_id
    )
    BEGIN
      SELECT RAISE(ABORT, 'professional service tenant mismatch');
    END;

    CREATE TRIGGER IF NOT EXISTS professional_services_tenant_guard_update
    BEFORE UPDATE OF tenant_id, professional_id, service_id ON professional_services
    WHEN NOT EXISTS (
      SELECT 1 FROM professionals p
      JOIN services s ON s.id = NEW.service_id
      WHERE p.id = NEW.professional_id
        AND p.tenant_id = NEW.tenant_id
        AND s.tenant_id = NEW.tenant_id
    )
    BEGIN
      SELECT RAISE(ABORT, 'professional service tenant mismatch');
    END;

    CREATE TRIGGER IF NOT EXISTS professional_hours_tenant_guard_insert
    BEFORE INSERT ON professional_hours
    WHEN NOT EXISTS (
      SELECT 1 FROM professionals p
      WHERE p.id = NEW.professional_id AND p.tenant_id = NEW.tenant_id
    )
    BEGIN
      SELECT RAISE(ABORT, 'professional hours tenant mismatch');
    END;

    CREATE TRIGGER IF NOT EXISTS professional_hours_tenant_guard_update
    BEFORE UPDATE OF tenant_id, professional_id ON professional_hours
    WHEN NOT EXISTS (
      SELECT 1 FROM professionals p
      WHERE p.id = NEW.professional_id AND p.tenant_id = NEW.tenant_id
    )
    BEGIN
      SELECT RAISE(ABORT, 'professional hours tenant mismatch');
    END;

    CREATE TRIGGER IF NOT EXISTS time_off_professional_tenant_guard_insert
    BEFORE INSERT ON time_off
    WHEN NEW.professional_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM professionals p
      WHERE p.id = NEW.professional_id AND p.tenant_id = NEW.tenant_id
    )
    BEGIN
      SELECT RAISE(ABORT, 'time off professional tenant mismatch');
    END;

    CREATE TRIGGER IF NOT EXISTS time_off_professional_tenant_guard_update
    BEFORE UPDATE OF tenant_id, professional_id ON time_off
    WHEN NEW.professional_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM professionals p
      WHERE p.id = NEW.professional_id AND p.tenant_id = NEW.tenant_id
    )
    BEGIN
      SELECT RAISE(ABORT, 'time off professional tenant mismatch');
    END;

    CREATE TRIGGER IF NOT EXISTS time_off_appointment_guard_insert
    BEFORE INSERT ON time_off
    WHEN EXISTS (
      SELECT 1 FROM appointments a
      WHERE a.tenant_id = NEW.tenant_id
        AND (NEW.professional_id IS NULL OR a.professional_id = NEW.professional_id)
        AND a.status IN ('PENDING', 'CONFIRMED')
        AND NOT (a.ends_at <= NEW.starts_at OR a.starts_at >= NEW.ends_at)
    )
    BEGIN
      SELECT RAISE(ABORT, 'time off conflicts with appointment');
    END;

    CREATE TRIGGER IF NOT EXISTS time_off_appointment_guard_update
    BEFORE UPDATE OF tenant_id, professional_id, starts_at, ends_at ON time_off
    WHEN EXISTS (
      SELECT 1 FROM appointments a
      WHERE a.tenant_id = NEW.tenant_id
        AND (NEW.professional_id IS NULL OR a.professional_id = NEW.professional_id)
        AND a.status IN ('PENDING', 'CONFIRMED')
        AND NOT (a.ends_at <= NEW.starts_at OR a.starts_at >= NEW.ends_at)
    )
    BEGIN
      SELECT RAISE(ABORT, 'time off conflicts with appointment');
    END;

    CREATE TRIGGER IF NOT EXISTS cash_professional_tenant_guard_insert
    BEFORE INSERT ON cash_transactions
    WHEN NEW.professional_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM professionals p
      WHERE p.id = NEW.professional_id AND p.tenant_id = NEW.tenant_id
    )
    BEGIN
      SELECT RAISE(ABORT, 'cash professional tenant mismatch');
    END;

    CREATE TRIGGER IF NOT EXISTS cash_professional_tenant_guard_update
    BEFORE UPDATE OF tenant_id, professional_id ON cash_transactions
    WHEN NEW.professional_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM professionals p
      WHERE p.id = NEW.professional_id AND p.tenant_id = NEW.tenant_id
    )
    BEGIN
      SELECT RAISE(ABORT, 'cash professional tenant mismatch');
    END;
  `)
}
