export type ProfessionalScheduleRange = {
  weekday: number
  startMinute: number
  endMinute: number
}

export type ProfessionalSchedule = {
  inheritsHours: boolean
  hours: ProfessionalScheduleRange[]
}

export type ProfessionalScheduleIssue = 'INVALID_RANGE' | 'OVERLAPPING_RANGE' | 'PROFESSIONAL_HOURS_EMPTY'

export function normalizeProfessionalSchedule(input: ProfessionalSchedule):
  | { ok: true; value: ProfessionalSchedule }
  | { ok: false; issue: ProfessionalScheduleIssue } {
  const ranges = [...input.hours].sort((a, b) => a.weekday - b.weekday || a.startMinute - b.startMinute)
  for (let index = 0; index < ranges.length; index += 1) {
    const range = ranges[index]
    if (range.endMinute <= range.startMinute) return { ok: false, issue: 'INVALID_RANGE' }
    const previous = ranges[index - 1]
    if (previous?.weekday === range.weekday && previous.endMinute > range.startMinute) {
      return { ok: false, issue: 'OVERLAPPING_RANGE' }
    }
  }
  if (!input.inheritsHours && !ranges.length) return { ok: false, issue: 'PROFESSIONAL_HOURS_EMPTY' }
  return { ok: true, value: { inheritsHours: input.inheritsHours, hours: ranges } }
}
