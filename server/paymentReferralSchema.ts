import type Database from 'better-sqlite3'

export function createPaymentReferralSchema(db: Database.Database) {
  db.exec(`
    ALTER TABLE payment_checkout_intents ADD COLUMN gross_amount_cents INTEGER NOT NULL DEFAULT 0 CHECK (gross_amount_cents >= 0);
    ALTER TABLE payment_checkout_intents ADD COLUMN discount_percent INTEGER NOT NULL DEFAULT 0 CHECK (discount_percent BETWEEN 0 AND 100);
    ALTER TABLE payment_checkout_intents ADD COLUMN referral_redemption_id TEXT REFERENCES referral_redemptions(id);
    UPDATE payment_checkout_intents SET gross_amount_cents = amount_cents;
    CREATE TABLE payment_referral_memberships (
      tenant_id TEXT PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
      link_id TEXT NOT NULL REFERENCES referral_links(id),
      created_at TEXT NOT NULL
    );
    CREATE TABLE payment_referral_debts (
      credit_id TEXT PRIMARY KEY REFERENCES referral_credits(id),
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      discount_percent INTEGER NOT NULL CHECK (discount_percent BETWEEN 1 AND 30),
      recovered_percent INTEGER NOT NULL DEFAULT 0 CHECK (recovered_percent >= 0 AND recovered_percent <= discount_percent)
    );
    CREATE TABLE payment_referral_debt_allocations (
      intent_id TEXT NOT NULL REFERENCES payment_checkout_intents(id),
      credit_id TEXT NOT NULL REFERENCES payment_referral_debts(credit_id),
      discount_percent INTEGER NOT NULL CHECK (discount_percent > 0),
      applied INTEGER NOT NULL DEFAULT 0 CHECK (applied IN (0,1)),
      PRIMARY KEY (intent_id, credit_id)
    );
    CREATE INDEX payment_referral_debts_tenant ON payment_referral_debts(tenant_id);
  `)
}
