import assert from 'node:assert/strict'
import test from 'node:test'
import { normalizeProfessionalSchedule } from './professionalSchedule.ts'

test('professional schedule preserves and sorts multiple daily ranges', () => {
  const result = normalizeProfessionalSchedule({
    inheritsHours: false,
    hours: [
      { weekday: 1, startMinute: 780, endMinute: 1080 },
      { weekday: 1, startMinute: 540, endMinute: 720 },
      { weekday: 3, startMinute: 600, endMinute: 900 },
    ],
  })
  assert.equal(result.ok, true)
  if (!result.ok) return
  assert.deepEqual(result.value.hours, [
    { weekday: 1, startMinute: 540, endMinute: 720 },
    { weekday: 1, startMinute: 780, endMinute: 1080 },
    { weekday: 3, startMinute: 600, endMinute: 900 },
  ])
})

test('professional schedule rejects overlaps in the same weekday', () => {
  const result = normalizeProfessionalSchedule({
    inheritsHours: false,
    hours: [
      { weekday: 2, startMinute: 540, endMinute: 780 },
      { weekday: 2, startMinute: 720, endMinute: 960 },
    ],
  })
  assert.deepEqual(result, { ok: false, issue: 'OVERLAPPING_RANGE' })
})

test('professional schedule allows touching ranges and inherited empty schedule', () => {
  const touching = normalizeProfessionalSchedule({
    inheritsHours: false,
    hours: [
      { weekday: 4, startMinute: 540, endMinute: 720 },
      { weekday: 4, startMinute: 720, endMinute: 900 },
    ],
  })
  assert.equal(touching.ok, true)
  assert.equal(normalizeProfessionalSchedule({ inheritsHours: true, hours: [] }).ok, true)
})

test('custom professional schedule requires at least one valid interval', () => {
  assert.deepEqual(normalizeProfessionalSchedule({ inheritsHours: false, hours: [] }), { ok: false, issue: 'PROFESSIONAL_HOURS_EMPTY' })
  assert.deepEqual(normalizeProfessionalSchedule({ inheritsHours: false, hours: [{ weekday: 5, startMinute: 900, endMinute: 900 }] }), { ok: false, issue: 'INVALID_RANGE' })
})
