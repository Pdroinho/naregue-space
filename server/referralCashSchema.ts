import type Database from 'better-sqlite3'

export function createReferralCashSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE referral_cash_links (
      link_id TEXT PRIMARY KEY REFERENCES referral_links(id) ON DELETE CASCADE, policy_version TEXT NOT NULL,
      accepted_by TEXT NOT NULL, accepted_at TEXT NOT NULL,policy_snapshot TEXT NOT NULL,policy_hash TEXT NOT NULL
    );
    CREATE TABLE referral_cash_rewards (
      id TEXT PRIMARY KEY, redemption_id TEXT NOT NULL UNIQUE, intent_id TEXT NOT NULL UNIQUE,
      owner_tenant_id TEXT NOT NULL, invited_tenant_id TEXT NOT NULL,
      policy_version TEXT NOT NULL, amount_cents INTEGER NOT NULL CHECK(amount_cents>0),
      status TEXT NOT NULL CHECK(status IN ('RESERVED','PENDING','AVAILABLE','REJECTED','REVERSED')),
      reason TEXT, created_at TEXT NOT NULL, paid_at TEXT, eligible_at TEXT,
      second_paid_at TEXT, reviewed_by TEXT, reviewed_at TEXT, review_note TEXT
    );
    CREATE INDEX referral_cash_rewards_owner ON referral_cash_rewards(owner_tenant_id,status);
    CREATE TABLE referral_cash_claims (
      identity_hash TEXT PRIMARY KEY, reward_id TEXT NOT NULL UNIQUE, created_at TEXT NOT NULL
    );
    CREATE TABLE referral_cash_withdrawals (
      id TEXT PRIMARY KEY, owner_tenant_id TEXT NOT NULL, requested_by TEXT NOT NULL,
      amount_cents INTEGER NOT NULL CHECK(amount_cents>=10000),
      status TEXT NOT NULL CHECK(status IN ('REQUESTED','SENDING','PAID','REJECTED','UNCERTAIN')),
      destination_enc TEXT NOT NULL, destination_hash TEXT NOT NULL,
      destination_type TEXT NOT NULL CHECK(destination_type IN ('CPF','CNPJ')),
      requested_at TEXT NOT NULL, reviewed_by TEXT, reviewed_at TEXT, review_note TEXT,
      provider_id TEXT UNIQUE, receipt_url TEXT, fee_cents INTEGER, provider_checked_at TEXT
    );
    CREATE UNIQUE INDEX referral_cash_one_open_withdrawal ON referral_cash_withdrawals(owner_tenant_id)
      WHERE status IN ('REQUESTED','SENDING','UNCERTAIN');
    CREATE TABLE referral_cash_audit (
      id TEXT PRIMARY KEY, actor_id TEXT, entity_id TEXT NOT NULL, action TEXT NOT NULL,
      created_at TEXT NOT NULL, note TEXT
    );
  `)
}
