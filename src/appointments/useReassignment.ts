import type { Ref } from 'vue'
import type { CalendarEvent } from './data'

export interface ReassignResult {
  reassigned: number
  skipped: number
}

/** Returns appointments belonging to fromMember in the date range, today or future only */
export function getAffectedEvents(
  events: CalendarEvent[],
  fromMemberId: string,
  startDate: string,
  endDate: string,
): CalendarEvent[] {
  const today = new Date().toISOString().slice(0, 10)
  return events
    .filter(e =>
      e.memberIds.includes(fromMemberId) &&
      e.date >= startDate &&
      e.date <= endDate &&
      e.date >= today,
    )
    .sort((a, b) =>
      a.date < b.date ? -1 :
      a.date > b.date ? 1 :
      (a.startTime ?? '') < (b.startTime ?? '') ? -1 : 1,
    )
}

function toMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

function eventsOverlap(a: CalendarEvent, b: CalendarEvent): boolean {
  if (a.date !== b.date) return false
  if (a.allDay || b.allDay) return true
  if (!a.startTime || !b.startTime) return false
  const aStart = toMinutes(a.startTime)
  const aEnd   = a.endTime ? toMinutes(a.endTime) : aStart + 30
  const bStart = toMinutes(b.startTime)
  const bEnd   = b.endTime ? toMinutes(b.endTime) : bStart + 30
  return aStart < bEnd && aEnd > bStart
}

/** Returns IDs of affected events that overlap with toMember's existing schedule */
export function detectConflicts(
  allEvents: CalendarEvent[],
  toMemberId: string,
  affected: CalendarEvent[],
): Set<string> {
  const affectedIds = new Set(affected.map(e => e.id))
  const toMemberEvents = allEvents.filter(
    e => e.memberIds.includes(toMemberId) && !affectedIds.has(e.id),
  )
  const conflictIds = new Set<string>()
  for (const aff of affected) {
    for (const existing of toMemberEvents) {
      if (eventsOverlap(aff, existing)) {
        conflictIds.add(aff.id)
        break
      }
    }
  }
  return conflictIds
}

/** Mutates the events ref — swaps fromMemberId → toMemberId on each affected event */
export function applyReassignment(
  events: Ref<CalendarEvent[]>,
  fromMemberId: string,
  toMemberId: string,
  affected: CalendarEvent[],
  conflictIds: Set<string>,
  skipConflicts: boolean,
): ReassignResult {
  const toProcess = skipConflicts
    ? affected.filter(e => !conflictIds.has(e.id))
    : affected
  const skipped    = skipConflicts ? conflictIds.size : 0
  const processIds = new Set(toProcess.map(e => e.id))

  events.value = events.value.map(ev => {
    if (!processIds.has(ev.id)) return ev
    const newMemberIds = ev.memberIds.filter(id => id !== fromMemberId)
    if (!newMemberIds.includes(toMemberId)) newMemberIds.push(toMemberId)
    return { ...ev, memberIds: newMemberIds }
  })

  return { reassigned: toProcess.length, skipped }
}
