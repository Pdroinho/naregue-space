import type Database from 'better-sqlite3'

type MigrationDb = Pick<Database.Database, 'exec' | 'prepare'>

export function ensureTeamAccessSchema(db: MigrationDb) {
  const columns = db.prepare(`PRAGMA table_info(professionals)`).all() as Array<{ name: string }>
  if (!columns.some((column) => column.name === 'user_id')) {
    db.exec(`ALTER TABLE professionals ADD COLUMN user_id TEXT REFERENCES users(id) ON DELETE SET NULL;`)
  }

  db.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_professionals_user
      ON professionals(user_id)
      WHERE user_id IS NOT NULL;

    CREATE TABLE IF NOT EXISTS professional_invites (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      professional_id TEXT NOT NULL,
      created_by_user_id TEXT NOT NULL,
      token_hash TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      accepted_at TEXT,
      revoked_at TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
      FOREIGN KEY (professional_id) REFERENCES professionals(id) ON DELETE CASCADE,
      FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_professional_invites_professional
      ON professional_invites(tenant_id, professional_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_professional_invites_expiry
      ON professional_invites(expires_at)
      WHERE accepted_at IS NULL AND revoked_at IS NULL;

    CREATE TRIGGER IF NOT EXISTS professionals_user_scope_guard_insert
    BEFORE INSERT ON professionals
    WHEN NEW.user_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM users u
        WHERE u.id = NEW.user_id
          AND u.tenant_id = NEW.tenant_id
          AND u.role IN ('ADMIN', 'PROFESSIONAL')
      )
    BEGIN
      SELECT RAISE(ABORT, 'professional user must belong to the same tenant');
    END;

    CREATE TRIGGER IF NOT EXISTS professionals_user_scope_guard_update
    BEFORE UPDATE OF user_id, tenant_id ON professionals
    WHEN NEW.user_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM users u
        WHERE u.id = NEW.user_id
          AND u.tenant_id = NEW.tenant_id
          AND u.role IN ('ADMIN', 'PROFESSIONAL')
      )
    BEGIN
      SELECT RAISE(ABORT, 'professional user must belong to the same tenant');
    END;

    CREATE TRIGGER IF NOT EXISTS professional_invites_scope_guard_insert
    BEFORE INSERT ON professional_invites
    WHEN NOT EXISTS (
        SELECT 1 FROM professionals p
        WHERE p.id = NEW.professional_id AND p.tenant_id = NEW.tenant_id
      )
      OR NOT EXISTS (
        SELECT 1 FROM users u
        WHERE u.id = NEW.created_by_user_id
          AND u.tenant_id = NEW.tenant_id
          AND u.role = 'ADMIN'
      )
    BEGIN
      SELECT RAISE(ABORT, 'professional invite must stay inside tenant');
    END;

    CREATE TRIGGER IF NOT EXISTS professional_invites_scope_guard_update
    BEFORE UPDATE OF tenant_id, professional_id, created_by_user_id ON professional_invites
    WHEN NOT EXISTS (
        SELECT 1 FROM professionals p
        WHERE p.id = NEW.professional_id AND p.tenant_id = NEW.tenant_id
      )
      OR NOT EXISTS (
        SELECT 1 FROM users u
        WHERE u.id = NEW.created_by_user_id
          AND u.tenant_id = NEW.tenant_id
          AND u.role = 'ADMIN'
      )
    BEGIN
      SELECT RAISE(ABORT, 'professional invite must stay inside tenant');
    END;
  `)

  const tenants = db.prepare(`SELECT id FROM tenants ORDER BY created_at ASC`).all() as Array<{ id: string }>
  const owner = db.prepare(`SELECT id FROM users WHERE tenant_id = ? AND role = 'ADMIN' ORDER BY created_at ASC LIMIT 1`)
  const firstProfessional = db.prepare(`SELECT id FROM professionals WHERE tenant_id = ? ORDER BY sort_order ASC, created_at ASC LIMIT 1`)
  const linkOwner = db.prepare(`UPDATE professionals SET user_id = ?, updated_at = ? WHERE id = ? AND tenant_id = ? AND user_id IS NULL`)
  const now = new Date().toISOString()

  for (const tenant of tenants) {
    const admin = owner.get(tenant.id) as { id: string } | undefined
    const professional = firstProfessional.get(tenant.id) as { id: string } | undefined
    if (admin && professional) linkOwner.run(admin.id, now, professional.id, tenant.id)
  }
}
