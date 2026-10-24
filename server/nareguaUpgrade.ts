import type Database from 'better-sqlite3'

/** Bridge the NaRégua 39/40 lineage without replaying Lash's unrelated versions. */
export function bridgeNareguaTeamSchema(db: Database.Database) {
  db.exec(`
    ALTER TABLE professionals ADD COLUMN bookable INTEGER NOT NULL DEFAULT 1 CHECK (bookable IN (0,1));
    CREATE UNIQUE INDEX IF NOT EXISTS idx_professionals_tenant_pair ON professionals(tenant_id,id);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_services_tenant_pair ON services(tenant_id,id);
    CREATE TABLE professional_time_off (
      id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, professional_id TEXT NOT NULL,
      starts_at TEXT NOT NULL, ends_at TEXT NOT NULL, reason TEXT,
      CHECK(starts_at < ends_at),
      FOREIGN KEY(tenant_id,professional_id) REFERENCES professionals(tenant_id,id) ON DELETE CASCADE
    );
    CREATE INDEX idx_professional_time_off_person ON professional_time_off(tenant_id,professional_id,starts_at);
    INSERT INTO professional_time_off(id,tenant_id,professional_id,starts_at,ends_at,reason)
      SELECT id,tenant_id,professional_id,starts_at,ends_at,reason FROM time_off WHERE professional_id IS NOT NULL;
    DELETE FROM time_off WHERE professional_id IS NOT NULL;
  `)
  // Rebuild only leaf tables to add defaults needed by the modular writers.
  // Preserve every existing column, row, index and tenant-scope trigger.
  for (const table of ['professional_services', 'professional_hours']) {
    const definition = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name=?").get(table) as { sql: string }
    const objects = db.prepare("SELECT sql FROM sqlite_master WHERE tbl_name=? AND type IN ('trigger','index') AND sql IS NOT NULL").all(table) as Array<{ sql: string }>
    const sql = definition.sql.replace(new RegExp(`CREATE TABLE (?:IF NOT EXISTS )?["\x60]?${table}["\x60]?`, 'i'), `CREATE TABLE ${table}_upgrade`)
      .replace(/created_at TEXT NOT NULL/i, "created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))")
    db.exec(sql)
    db.exec(`INSERT INTO ${table}_upgrade SELECT * FROM ${table}; DROP TABLE ${table}; ALTER TABLE ${table}_upgrade RENAME TO ${table};`)
    for (const object of objects) db.exec(object.sql)
  }
  // The new runtime names individual access STAFF; keep account IDs and sessions.
  db.exec(`UPDATE users SET role='STAFF' WHERE role='PROFESSIONAL';`)
  for (const name of ['professionals_user_scope_guard_insert', 'professionals_user_scope_guard_update']) {
    const trigger = db.prepare("SELECT sql FROM sqlite_master WHERE type='trigger' AND name=?").get(name) as { sql: string } | undefined
    if (trigger) { db.exec(`DROP TRIGGER ${name}`); db.exec(trigger.sql.replace("'ADMIN', 'PROFESSIONAL'", "'ADMIN', 'STAFF', 'PROFESSIONAL'")) }
  }
  db.exec(`
    CREATE TRIGGER new_tenant_default_professional AFTER INSERT ON tenants BEGIN
      INSERT INTO professionals(id,tenant_id,name,created_at,updated_at) VALUES(NEW.id,NEW.id,'Profissional principal',NEW.created_at,NEW.created_at);
    END;
    CREATE TRIGGER new_service_default_professional AFTER INSERT ON services BEGIN
      INSERT OR IGNORE INTO professional_services(tenant_id,professional_id,service_id)
      SELECT NEW.tenant_id,p.id,NEW.id FROM professionals p WHERE p.tenant_id=NEW.tenant_id AND p.active=1
      ORDER BY p.sort_order,p.created_at LIMIT 1;
    END;
    CREATE TRIGGER professional_time_off_scope_insert BEFORE INSERT ON professional_time_off
    WHEN NOT EXISTS(SELECT 1 FROM professionals WHERE id=NEW.professional_id AND tenant_id=NEW.tenant_id)
    BEGIN SELECT RAISE(ABORT,'professional time off tenant mismatch'); END;
    CREATE TRIGGER professional_time_off_conflict_insert BEFORE INSERT ON professional_time_off
    WHEN EXISTS(SELECT 1 FROM appointments a WHERE a.tenant_id=NEW.tenant_id AND a.professional_id=NEW.professional_id
      AND a.status IN ('PENDING','CONFIRMED') AND a.starts_at<NEW.ends_at AND a.ends_at>NEW.starts_at)
    BEGIN SELECT RAISE(ABORT,'professional time off conflicts with appointment'); END;
    CREATE TRIGGER appointments_personal_time_off_insert BEFORE INSERT ON appointments
    WHEN NEW.status IN ('PENDING','CONFIRMED') AND EXISTS(SELECT 1 FROM professional_time_off t WHERE t.tenant_id=NEW.tenant_id
      AND t.professional_id=NEW.professional_id AND t.starts_at<NEW.ends_at AND t.ends_at>NEW.starts_at)
    BEGIN SELECT RAISE(ABORT,'appointment slot unavailable'); END;
    CREATE TRIGGER appointments_personal_time_off_update BEFORE UPDATE OF starts_at,ends_at,professional_id,status ON appointments
    WHEN NEW.status IN ('PENDING','CONFIRMED') AND EXISTS(SELECT 1 FROM professional_time_off t WHERE t.tenant_id=NEW.tenant_id
      AND t.professional_id=NEW.professional_id AND t.starts_at<NEW.ends_at AND t.ends_at>NEW.starts_at)
    BEGIN SELECT RAISE(ABORT,'appointment slot unavailable'); END;
  `)
}

export function createNareguaPaymentAndPriceSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE abacatepay_checkouts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      external_id TEXT NOT NULL UNIQUE, provider_id TEXT UNIQUE,
      product_id TEXT, amount_cents INTEGER NOT NULL CHECK(amount_cents>=100),
      status TEXT NOT NULL DEFAULT 'CREATING', checkout_url TEXT,
      created_at TEXT NOT NULL, updated_at TEXT NOT NULL
    );
    ALTER TABLE appointments ADD COLUMN booked_price_cents INTEGER;
    ALTER TABLE appointments ADD COLUMN price_source TEXT;
    UPDATE appointments SET booked_price_cents=(SELECT price_cents FROM services WHERE services.id=appointments.service_id),price_source='MIGRATED_CATALOG';
    CREATE TRIGGER appointments_capture_price AFTER INSERT ON appointments WHEN NEW.booked_price_cents IS NULL BEGIN
      UPDATE appointments SET booked_price_cents=(SELECT price_cents FROM services WHERE id=NEW.service_id AND tenant_id=NEW.tenant_id),price_source='BOOKING' WHERE id=NEW.id;
    END;
    CREATE TRIGGER appointments_reprice_service AFTER UPDATE OF service_id ON appointments WHEN NEW.service_id<>OLD.service_id BEGIN
      UPDATE appointments SET booked_price_cents=(SELECT price_cents FROM services WHERE id=NEW.service_id AND tenant_id=NEW.tenant_id),price_source='SERVICE_CHANGE' WHERE id=NEW.id;
    END;
  `)
}
