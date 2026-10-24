import assert from 'node:assert/strict'
import test from 'node:test'
import { DatabaseSync } from 'node:sqlite'
import { ensureTeamAccessSchema } from './teamAccessMigration.ts'

function baseDb() {
  const db = new DatabaseSync(':memory:')
  db.exec(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE tenants (id TEXT PRIMARY KEY, created_at TEXT NOT NULL);
    CREATE TABLE users (
      id TEXT PRIMARY KEY,
      tenant_id TEXT,
      email TEXT NOT NULL,
      role TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    );
    CREATE TABLE professionals (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      name TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    );
    INSERT INTO tenants VALUES ('t1', '2026-01-01T00:00:00Z');
    INSERT INTO tenants VALUES ('t2', '2026-01-02T00:00:00Z');
    INSERT INTO users VALUES ('owner1', 't1', 'owner1@example.com', 'ADMIN', '2026-01-01T00:00:00Z');
    INSERT INTO users VALUES ('owner2', 't2', 'owner2@example.com', 'ADMIN', '2026-01-02T00:00:00Z');
    INSERT INTO users VALUES ('pro1', 't1', 'pro1@example.com', 'PROFESSIONAL', '2026-01-03T00:00:00Z');
    INSERT INTO users VALUES ('client1', 't1', 'client1@example.com', 'CLIENT', '2026-01-04T00:00:00Z');
    INSERT INTO professionals VALUES ('p1', 't1', 'Primeira cadeira', 0, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z');
    INSERT INTO professionals VALUES ('p2', 't1', 'Segunda cadeira', 1, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z');
    INSERT INTO professionals VALUES ('p3', 't2', 'Cadeira Norte', 0, '2026-01-02T00:00:00Z', '2026-01-02T00:00:00Z');
  `)
  return db
}

test('team access migration links only the first professional to each owner', () => {
  const db = baseDb()
  ensureTeamAccessSchema(db)
  assert.equal(db.prepare(`SELECT user_id userId FROM professionals WHERE id = 'p1'`).get().userId, 'owner1')
  assert.equal(db.prepare(`SELECT user_id userId FROM professionals WHERE id = 'p2'`).get().userId, null)
  assert.equal(db.prepare(`SELECT user_id userId FROM professionals WHERE id = 'p3'`).get().userId, 'owner2')
  assert.equal(db.prepare(`SELECT COUNT(*) count FROM professional_invites`).get().count, 0)
})

test('one user cannot be linked to two professional profiles', () => {
  const db = baseDb()
  ensureTeamAccessSchema(db)
  assert.throws(() => db.prepare(`UPDATE professionals SET user_id = 'owner1' WHERE id = 'p2'`).run())
})

test('team access migration is idempotent after schema exists', () => {
  const db = baseDb()
  ensureTeamAccessSchema(db)
  ensureTeamAccessSchema(db)
  assert.equal(db.prepare(`SELECT COUNT(*) count FROM pragma_table_info('professionals') WHERE name = 'user_id'`).get().count, 1)
})

test('professional account link cannot cross tenant or use a client account', () => {
  const db = baseDb()
  ensureTeamAccessSchema(db)
  assert.throws(() => db.prepare(`UPDATE professionals SET user_id = 'owner2' WHERE id = 'p2'`).run())
  assert.throws(() => db.prepare(`UPDATE professionals SET user_id = 'client1' WHERE id = 'p2'`).run())
  db.prepare(`UPDATE professionals SET user_id = 'pro1' WHERE id = 'p2'`).run()
  assert.equal(db.prepare(`SELECT user_id userId FROM professionals WHERE id = 'p2'`).get().userId, 'pro1')
})

test('professional invitations cannot cross tenant boundaries or be issued by non-admin users', () => {
  const db = baseDb()
  ensureTeamAccessSchema(db)
  const insert = db.prepare(`
    INSERT INTO professional_invites (
      id, tenant_id, professional_id, created_by_user_id, token_hash, email, expires_at, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `)
  const expiresAt = '2026-09-01T00:00:00Z'
  const createdAt = '2026-08-25T00:00:00Z'
  assert.throws(() => insert.run('i1', 't1', 'p3', 'owner1', 'hash-1', 'pro@example.com', expiresAt, createdAt))
  assert.throws(() => insert.run('i2', 't1', 'p2', 'client1', 'hash-2', 'pro@example.com', expiresAt, createdAt))
  insert.run('i3', 't1', 'p2', 'owner1', 'hash-3', 'pro@example.com', expiresAt, createdAt)
  assert.equal(db.prepare(`SELECT COUNT(*) count FROM professional_invites`).get().count, 1)
})

