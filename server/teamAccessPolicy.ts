import { createHash } from 'node:crypto'

export const TEAM_INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000

export type TeamInviteSecurityState = {
  tenantId: string
  tenantStatus: string
  expiresAt: string
  acceptedAt: string | null
  revokedAt: string | null
  professionalUserId: string | null
}

export type TeamInviteSecurityIssue =
  | 'UNAVAILABLE'
  | 'TENANT_INACTIVE'
  | 'HOST_MISMATCH'
  | 'ACCESS_EXISTS'
  | null

export function teamInviteTokenHash(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

export function teamInviteExpiresAt(nowMs = Date.now()) {
  return new Date(nowMs + TEAM_INVITE_TTL_MS).toISOString()
}

export function teamInviteSecurityIssue(
  invite: TeamInviteSecurityState | undefined,
  resolvedTenantId: string | null | undefined,
  nowMs = Date.now(),
): TeamInviteSecurityIssue {
  if (!invite || invite.revokedAt || invite.acceptedAt || Date.parse(invite.expiresAt) <= nowMs) return 'UNAVAILABLE'
  if (invite.tenantStatus !== 'ACTIVE') return 'TENANT_INACTIVE'
  if (!resolvedTenantId || resolvedTenantId !== invite.tenantId) return 'HOST_MISMATCH'
  if (invite.professionalUserId) return 'ACCESS_EXISTS'
  return null
}
