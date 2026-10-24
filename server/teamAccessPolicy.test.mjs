import assert from 'node:assert/strict'
import test from 'node:test'
import {
  TEAM_INVITE_TTL_MS,
  teamInviteExpiresAt,
  teamInviteSecurityIssue,
  teamInviteTokenHash,
} from './teamAccessPolicy.ts'

const NOW = Date.parse('2026-08-25T12:00:00.000Z')
const usableInvite = {
  tenantId: 'tenant-a',
  tenantStatus: 'ACTIVE',
  expiresAt: new Date(NOW + 60_000).toISOString(),
  acceptedAt: null,
  revokedAt: null,
  professionalUserId: null,
}

test('team invitation tokens are persisted only through a deterministic SHA-256 digest', () => {
  const token = 'a-private-team-invite-token'
  const digest = teamInviteTokenHash(token)
  assert.match(digest, /^[a-f0-9]{64}$/)
  assert.notEqual(digest, token)
  assert.equal(digest, teamInviteTokenHash(token))
  assert.notEqual(digest, teamInviteTokenHash(`${token}-other`))
})

test('team invitation expiry is exactly seven days from issuance', () => {
  assert.equal(Date.parse(teamInviteExpiresAt(NOW)) - NOW, TEAM_INVITE_TTL_MS)
})

test('team invitation is accepted only on the tenant that issued it', () => {
  assert.equal(teamInviteSecurityIssue(usableInvite, 'tenant-a', NOW), null)
  assert.equal(teamInviteSecurityIssue(usableInvite, 'tenant-b', NOW), 'HOST_MISMATCH')
  assert.equal(teamInviteSecurityIssue(usableInvite, null, NOW), 'HOST_MISMATCH')
})

test('accepted, revoked, expired and missing invitations are unavailable', () => {
  assert.equal(teamInviteSecurityIssue(undefined, 'tenant-a', NOW), 'UNAVAILABLE')
  assert.equal(teamInviteSecurityIssue({ ...usableInvite, acceptedAt: new Date(NOW).toISOString() }, 'tenant-a', NOW), 'UNAVAILABLE')
  assert.equal(teamInviteSecurityIssue({ ...usableInvite, revokedAt: new Date(NOW).toISOString() }, 'tenant-a', NOW), 'UNAVAILABLE')
  assert.equal(teamInviteSecurityIssue({ ...usableInvite, expiresAt: new Date(NOW).toISOString() }, 'tenant-a', NOW), 'UNAVAILABLE')
})

test('inactive tenants and already linked professional accounts cannot consume invitations', () => {
  assert.equal(teamInviteSecurityIssue({ ...usableInvite, tenantStatus: 'SUSPENDED' }, 'tenant-a', NOW), 'TENANT_INACTIVE')
  assert.equal(teamInviteSecurityIssue({ ...usableInvite, professionalUserId: 'user-professional' }, 'tenant-a', NOW), 'ACCESS_EXISTS')
})
