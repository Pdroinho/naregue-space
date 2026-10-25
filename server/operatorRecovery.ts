import type Database from 'better-sqlite3'
import { logSecurityEvent, refreshWhatsappOtpChallenge } from './mfa.js'

// Called only from the host/container CLI. There is intentionally no HTTP issuer.
export function issueOperatorRecoveryCode(db: Database.Database, email?: string) {
  return db.transaction(() => {
    const operators = db.prepare(`SELECT id, phone FROM users
      WHERE role = 'DEV' AND tenant_id IS NULL ${email ? 'AND lower(email) = ?' : ''}`)
      .all(...(email ? [email.toLowerCase()] : [])) as Array<{ id: string; phone: string | null }>
    if (operators.length !== 1) throw new Error('Informe o e-mail de um único operador DEV existente.')
    const operator = operators[0]
    const now = new Date()
    const challenge = db.prepare(`SELECT id, phone_snapshot AS phone FROM auth_challenges
      WHERE user_id = ? AND kind = 'WHATSAPP_OTP' AND consumed_at IS NULL
        AND expires_at > ? AND created_at > ?
      ORDER BY created_at DESC LIMIT 1`)
      .get(operator.id, now.toISOString(), new Date(now.getTime() - 10 * 60_000).toISOString()) as { id: string; phone: string } | undefined
    if (!challenge) throw new Error('Entre primeiro com e-mail e senha no painel DEV. Depois execute novamente em até 5 minutos.')
    if (!operator.phone || operator.phone !== challenge.phone) throw new Error('O telefone da conta mudou. Reinicie o login antes da recuperação.')
    const refreshed = refreshWhatsappOtpChallenge(db, challenge.id, operator.id, operator.phone)
    if (!refreshed) throw new Error('Desafio já utilizado. Reinicie o login.')
    logSecurityEvent(db, {
      eventType: 'OPERATOR_RECOVERY_CODE_ISSUED', userId: operator.id,
      details: { challengeId: challenge.id, source: 'server-console', expiresAt: refreshed.expiresAt },
    })
    return { code: refreshed.code, expiresAt: refreshed.expiresAt }
  })()
}
