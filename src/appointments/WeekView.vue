<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { DexText, DexPopover, DexButton, DexIconButton, DexBox, DexInline } from '@thryvlabs/dex-vue'
import type { TeamMember, CalendarEvent, PopoverFields } from './data'

defineOptions({ name: 'WeekView' })

const props = defineProps<{
  weekStart: Date
  events: CalendarEvent[]
  teamMembers: TeamMember[]
  popoverFields: PopoverFields
  startHour: number
  endHour: number
}>()

const emit = defineEmits<{
  openNewEvent:  [date: string]
  reassignDay:   [date: string]
  reassignEvent: [ev: CalendarEvent]
}>()

const HOUR_HEIGHT = 64
const HOURS = computed(() => Array.from({ length: props.endHour - props.startHour }, (_, i) => props.startHour + i))

const todayStr = new Date().toISOString().slice(0, 10)

const now = new Date()
const currentTimePx = computed(() => {
  const mins = now.getHours() * 60 + now.getMinutes()
  return (mins - props.startHour * 60) / 60 * HOUR_HEIGHT
})

const weekDays = computed(() =>
  Array.from({ length: 7 }, (_, i) => {
    const d = new Date(props.weekStart)
    d.setDate(d.getDate() + i)
    return d
  })
)

function dateStr(d: Date) {
  return d.toISOString().slice(0, 10)
}

function formatHour(h: number) {
  if (h === 0) return '12 AM'
  if (h < 12) return `${h} AM`
  if (h === 12) return '12 PM'
  return `${h - 12} PM`
}

function timeToMins(t: string) {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

// ── All-day events ──────────────────────────────────────────────────
function allDayEventsFor(date: string) {
  return props.events.filter(e => e.allDay && e.date === date)
}

const expandedDays = ref<Set<string>>(new Set())
const MAX_ALLDAY = 2

function toggleExpand(date: string) {
  const s = new Set(expandedDays.value)
  s.has(date) ? s.delete(date) : s.add(date)
  expandedDays.value = s
}

// ── Timed event layout ──────────────────────────────────────────────
interface PositionedEvent extends CalendarEvent {
  top: number
  height: number
  leftPct: number
  widthPct: number
  color: string
  bg: string
}

// Returns true if two timed events overlap in time
function eventsOverlap(a: CalendarEvent, b: CalendarEvent): boolean {
  const aStart = timeToMins(a.startTime!)
  const aEnd   = a.endTime ? timeToMins(a.endTime) : aStart + 30
  const bStart = timeToMins(b.startTime!)
  const bEnd   = b.endTime ? timeToMins(b.endTime) : bStart + 30
  return aStart < bEnd && aEnd > bStart
}

function layoutEvents(date: string): PositionedEvent[] {
  const dayEvents = props.events.filter(e => !e.allDay && e.date === date && e.startTime)
  if (!dayEvents.length) return []

  const sorted = [...dayEvents].sort((a, b) =>
    timeToMins(a.startTime!) - timeToMins(b.startTime!)
  )

  // Assign a lane (column) to each event using a greedy algorithm
  const laneEnds: number[] = []
  const withLanes = sorted.map(ev => {
    const start = timeToMins(ev.startTime!)
    const end   = ev.endTime ? timeToMins(ev.endTime) : start + 30
    let lane = laneEnds.findIndex(e => e <= start)
    if (lane === -1) { lane = laneEnds.length; laneEnds.push(end) }
    else laneEnds[lane] = end
    return { ev, lane }
  })

  return withLanes.map(({ ev, lane }) => {
    const startMins  = timeToMins(ev.startTime!)
    const endMins    = ev.endTime ? timeToMins(ev.endTime) : startMins + 30
    const clamped    = Math.max(startMins, props.startHour * 60)
    const clampedEnd = Math.min(endMins, props.endHour * 60)
    const top    = (clamped - props.startHour * 60) / 60 * HOUR_HEIGHT
    const height = Math.max((clampedEnd - clamped) / 60 * HOUR_HEIGHT, 22)
    const primary = props.teamMembers.find(m => m.id === ev.memberIds[0])

    // Only count events that actually overlap THIS event (not all day's events)
    const concurrent = withLanes
      .filter(({ ev: other }) => eventsOverlap(ev, other))
      .sort((a, b) => a.lane - b.lane)
    const groupSize  = concurrent.length
    const myPosition = concurrent.findIndex(({ ev: other }) => other.id === ev.id)

    return {
      ...ev,
      top,
      height,
      leftPct:  (myPosition / groupSize) * 100,
      widthPct: 100 / groupSize,
      color: primary?.color ?? '#1a73e8',
      bg:    primary?.bg    ?? '#e8f0fe',
    }
  })
}

function memberName(id: string) {
  return props.teamMembers.find(m => m.id === id)?.name ?? ''
}

function memberLastName(id: string) {
  return memberName(id).split(' ').at(-1) ?? ''
}

function memberColor(id: string) {
  return props.teamMembers.find(m => m.id === id)?.color ?? '#888'
}

function memberBg(id: string) {
  return props.teamMembers.find(m => m.id === id)?.bg ?? '#f5f5f5'
}

// ── Event detail popover ────────────────────────────────────────────
const selectedId = ref<string | null>(null)

function togglePopover(id: string) {
  selectedId.value = selectedId.value === id ? null : id
}

function formatTime(t?: string) {
  if (!t) return ''
  const [h, m] = t.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hr = h % 12 || 12
  return `${hr}:${m.toString().padStart(2, '0')} ${ampm}`
}

function eventAriaLabel(ev: CalendarEvent): string {
  const parts: string[] = [ev.title, ev.type]
  if (ev.allDay) {
    parts.push('All day')
  } else if (ev.startTime) {
    parts.push(`${formatTime(ev.startTime)}${ev.endTime ? ' to ' + formatTime(ev.endTime) : ''}`)
  }
  if (ev.memberIds.length) {
    parts.push(`Assigned to ${ev.memberIds.map(memberName).join(' and ')}`)
  }
  return parts.join(', ')
}
</script>

<template>
  <div role="region" aria-label="Weekly calendar" class="flex flex-col flex-1 overflow-hidden min-w-0" :style="{ backgroundColor: 'var(--dex-page-bgColor)' }">
    <!-- Day header row -->
    <div class="flex flex-shrink-0 z-10" :style="{ borderBottom: '1px solid var(--dex-borderColor-alpha-subtle)', backgroundColor: 'var(--dex-page-bgColor)' }">
      <div class="w-14 flex-shrink-0" />
      <div class="flex-1 grid grid-cols-7">
        <div
          v-for="day in weekDays"
          :key="dateStr(day)"
          role="button"
          :tabindex="0"
          class="py-2 text-center select-none cursor-pointer relative group"
          :style="{ borderLeft: '1px solid var(--dex-borderColor-alpha-subtle)' }"
          :aria-label="`Add event on ${day.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}`"
          @click="emit('openNewEvent', dateStr(day))"
          @keydown.enter.prevent="emit('openNewEvent', dateStr(day))"
          @keydown.space.prevent="emit('openNewEvent', dateStr(day))"
        >
          <!-- Day name -->
          <DexText
            variant="caption"
            :style="dateStr(day) === todayStr
              ? { color: 'var(--dex-color-accent-blue-emphasis)' }
              : { color: 'var(--dex-fgColor-subtle)' }"
          >{{ day.toLocaleDateString('en-US', { weekday: 'short' }) }}</DexText>

          <!-- Date number -->
          <div class="flex items-center justify-center mt-0.5">
            <DexText
              variant="headline-4"
              :style="dateStr(day) === todayStr
                ? { color: 'var(--dex-color-accent-blue-emphasis)', fontWeight: 'var(--dex-font-weight-semibold)' }
                : { color: 'var(--dex-page-fgColor)', fontWeight: 'var(--dex-font-weight-regular)' }"
            >{{ day.getDate() }}</DexText>
          </div>

          <!-- Reassign day button — visible on hover -->
          <button
            class="absolute top-1 right-1 rounded p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
            :style="{ color: 'var(--dex-fgColor-subtle)' }"
            :title="`Reassign ${day.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })} appointments`"
            @click.stop="emit('reassignDay', dateStr(day))"
          >
            <svg aria-hidden="true" class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/>
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- All-day row -->
    <div class="flex flex-shrink-0" :style="{ borderBottom: '1px solid var(--dex-borderColor-alpha-subtle)', backgroundColor: 'var(--dex-page-bgColor)' }">
      <div class="w-14 flex-shrink-0 flex items-center justify-end pr-2 py-1.5">
        <DexText variant="caption" color="subtle">All Day</DexText>
      </div>
      <div class="flex-1 grid grid-cols-7">
        <div
          v-for="day in weekDays"
          :key="dateStr(day)"
          class="min-h-[28px] px-0.5 py-0.5"
          :style="{ borderLeft: '1px solid var(--dex-borderColor-alpha-subtle)' }"
        >
          <DexPopover
            v-for="ev in allDayEventsFor(dateStr(day)).slice(0, expandedDays.has(dateStr(day)) ? Infinity : MAX_ALLDAY)"
            :key="ev.id"
            :open="selectedId === ev.id"
            side="right"
            align="start"
            @update:open="(v) => !v && (selectedId = null)"
          >
            <template #default>
              <div
                role="button"
                :tabindex="0"
                class="allday-card px-1.5 py-0.5 rounded mb-0.5 truncate cursor-pointer hover:opacity-80 transition-opacity"
                :style="{
                  backgroundColor: memberBg(ev.memberIds[0]),
                  color: memberColor(ev.memberIds[0]),
                  fontSize: 'var(--dex-text-body2-fontSize)',
                  lineHeight: 'var(--dex-text-body2-lineHeight)',
                  fontWeight: 'var(--dex-font-weight-medium)',
                  '--card-focus-color': memberColor(ev.memberIds[0]),
                }"
                :aria-label="eventAriaLabel(ev)"
                :aria-expanded="selectedId === ev.id"
                aria-haspopup="dialog"
                @click.stop="togglePopover(ev.id)"
                @keydown.enter.prevent.stop="togglePopover(ev.id)"
                @keydown.space.prevent.stop="togglePopover(ev.id)"
              >{{ ev.title }}</div>
            </template>
            <template #content>
              <div class="w-72 rounded-2xl overflow-hidden" @click.stop>
                <!-- Popover header -->
                <DexBox padding="150" :style="{ borderBottom: '1px solid var(--dex-borderColor-alpha-subtle)', backgroundColor: 'var(--dex-surface-flat-bgColor)' }">
                  <DexInline align-y="center" align-x="spread" stretch>
                    <DexInline align-y="center" gap="100">
                      <span class="w-3 h-3 rounded-full flex-shrink-0" :style="{ backgroundColor: memberColor(ev.memberIds[0]) }" />
                      <DexText variant="body-2" :style="{ fontWeight: 'var(--dex-font-weight-semibold)' }">{{ ev.title }}</DexText>
                    </DexInline>
                    <DexIconButton name="x" label="Close" size="dense" @click="selectedId = null" />
                  </DexInline>
                </DexBox>
                <!-- Popover body -->
                <div class="px-4 py-3 space-y-2.5">
                  <div v-if="popoverFields.time && !ev.allDay && ev.startTime" class="flex items-center gap-2">
                    <svg aria-hidden="true" class="w-4 h-4 flex-shrink-0" :style="{ color: 'var(--dex-fgColor-subtle)' }" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                    <DexText variant="body-2" color="subtle">{{ formatTime(ev.startTime) }}{{ ev.endTime ? ` – ${formatTime(ev.endTime)}` : '' }}</DexText>
                  </div>
                  <div v-if="popoverFields.client && ev.clientName" class="flex items-start gap-2">
                    <svg aria-hidden="true" class="w-4 h-4 flex-shrink-0 mt-0.5" :style="{ color: 'var(--dex-fgColor-subtle)' }" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                    <div>
                      <RouterLink
                        v-if="ev.clientId"
                        :to="`/contacts/contact/${ev.clientId}`"
                        class="hover:underline block"
                        :style="{
                          color: 'var(--dex-color-accent-blue-emphasis)',
                          fontSize: 'var(--dex-text-body2-fontSize)',
                          fontWeight: 'var(--dex-font-weight-semibold)',
                          lineHeight: 'var(--dex-text-body2-lineHeight)',
                        }"
                        @click="selectedId = null"
                      >{{ ev.clientName }}</RouterLink>
                      <span
                        v-else
                        class="block"
                        :style="{
                          color: 'var(--dex-page-fgColor)',
                          fontSize: 'var(--dex-text-body2-fontSize)',
                          fontWeight: 'var(--dex-font-weight-semibold)',
                          lineHeight: 'var(--dex-text-body2-lineHeight)',
                        }"
                      >{{ ev.clientName }}</span>
                      <DexText v-if="ev.clientPhone" variant="x-small" color="subtle">{{ ev.clientPhone }}</DexText>
                    </div>
                  </div>
                  <div v-if="popoverFields.address && ev.clientAddress" class="flex items-start gap-2">
                    <svg aria-hidden="true" class="w-4 h-4 flex-shrink-0 mt-0.5" :style="{ color: 'var(--dex-fgColor-subtle)' }" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                    <DexText variant="body-2" color="subtle">{{ ev.clientAddress }}</DexText>
                  </div>
                  <div v-if="popoverFields.type" class="flex items-center gap-2">
                    <svg aria-hidden="true" class="w-4 h-4 flex-shrink-0" :style="{ color: 'var(--dex-fgColor-subtle)' }" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/></svg>
                    <a :href="'https://summithvac.com/book/' + ev.type.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')" target="_blank" class="popover-type-link">
                      <DexText variant="body-2" color="primary">{{ ev.type }}</DexText>
                    </a>
                  </div>
                  <div v-if="popoverFields.notes && ev.notes" class="flex items-start gap-2">
                    <svg aria-hidden="true" class="w-4 h-4 flex-shrink-0 mt-0.5" :style="{ color: 'var(--dex-fgColor-subtle)' }" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                    <DexText variant="body-2" color="subtle" :style="{ lineHeight: '1.5' }">{{ ev.notes }}</DexText>
                  </div>
                  <div v-if="popoverFields.members && ev.memberIds.length" class="flex items-start gap-2">
                    <svg aria-hidden="true" class="w-4 h-4 flex-shrink-0 mt-0.5" :style="{ color: 'var(--dex-fgColor-subtle)' }" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                    <div class="flex flex-wrap gap-1">
                      <span
                        v-for="id in ev.memberIds"
                        :key="id"
                        class="px-2 py-0.5 rounded-full"
                        :style="{
                          backgroundColor: memberBg(id),
                          color: memberColor(id),
                          fontSize: 'var(--dex-text-caption-fontSize)',
                          fontWeight: 'var(--dex-font-weight-medium)',
                        }"
                      >{{ memberName(id) }}</span>
                    </div>
                  </div>
                </div>
                <div class="px-4 pb-3" :style="{ borderTop: '1px solid var(--dex-borderColor-alpha-subtle)' }">
                  <DexButton
                    variant="transparent"
                    size="sm"
                    leading-icon="refresh-cw"
                    class="w-full mt-2.5"
                    @click.stop="selectedId = null; emit('reassignEvent', ev)"
                  >Reassign</DexButton>
                </div>
              </div>
            </template>
          </DexPopover>
          <button
            v-if="allDayEventsFor(dateStr(day)).length > MAX_ALLDAY && !expandedDays.has(dateStr(day))"
            class="px-1 py-0.5 transition-colors hover:opacity-70"
            :style="{
              color: 'var(--dex-color-accent-blue-emphasis)',
              fontSize: 'var(--dex-text-caption-fontSize)',
              fontWeight: 'var(--dex-font-weight-medium)',
            }"
            :aria-label="`Show ${allDayEventsFor(dateStr(day)).length - MAX_ALLDAY} more all-day events`"
            @click.stop="toggleExpand(dateStr(day))"
          >+{{ allDayEventsFor(dateStr(day)).length - MAX_ALLDAY }} more</button>
        </div>
      </div>
    </div>

    <!-- Scrollable time grid -->
    <div class="flex-1 overflow-y-auto" @click="selectedId = null">
      <div class="flex" :style="{ height: `${HOURS.length * HOUR_HEIGHT}px` }" >
        <!-- Time gutter -->
        <div class="w-14 flex-shrink-0 relative select-none">
          <div
            v-for="h in HOURS"
            :key="h"
            class="absolute right-2 leading-none"
            :style="{ top: `${(h - props.startHour) * HOUR_HEIGHT + 4}px` }"
          ><DexText variant="caption" color="subtle">{{ formatHour(h) }}</DexText></div>
        </div>

        <!-- Grid -->
        <div class="flex-1 relative min-w-0">
          <!-- Hour lines -->
          <div
            v-for="h in HOURS"
            :key="h"
            class="absolute left-0 right-0 pointer-events-none"
            :style="{ borderTop: '1px solid var(--dex-borderColor-alpha-subtle)', top: `${(h - props.startHour) * HOUR_HEIGHT}px` }"
          />

          <!-- Current time indicator (today only) -->
          <div
            v-if="weekDays.some(d => dateStr(d) === todayStr)"
            aria-hidden="true"
            class="absolute pointer-events-none z-20"
            :style="{
              top: `${currentTimePx}px`,
              left: `calc(${weekDays.findIndex(d => dateStr(d) === todayStr) / 7 * 100}% + 1px)`,
              width: `calc(${100/7}% - 2px)`,
            }"
          >
            <div class="relative flex items-center">
              <div class="w-2.5 h-2.5 rounded-full bg-blue-600 flex-shrink-0 -ml-1.5" />
              <div class="flex-1 h-px bg-blue-600" />
            </div>
          </div>

          <!-- Day columns -->
          <div class="absolute inset-0 grid grid-cols-7">
            <div
              v-for="day in weekDays"
              :key="dateStr(day)"
              :style="{
                position: 'relative',
                borderLeft: '1px solid var(--dex-borderColor-alpha-subtle)',
                height: '100%',
              }"
            >
              <!-- Events -->
              <div
                v-for="ev in layoutEvents(dateStr(day))"
                :key="ev.id"
                class="absolute"
                :style="{
                  top: `${ev.top + 1}px`,
                  height: `${ev.height - 2}px`,
                  left: `calc(${ev.leftPct}% + 2px)`,
                  width: `calc(${ev.widthPct}% - 4px)`,
                }"
              >
                <DexPopover
                  :open="selectedId === ev.id"
                  side="right"
                  align="start"
                  @update:open="(v) => !v && (selectedId = null)"
                >
                  <template #default>
                    <div
                      role="button"
                      :tabindex="0"
                      class="event-card w-full h-full rounded overflow-hidden cursor-pointer transition-all hover:brightness-95 hover:shadow-md select-none"
                      :style="{ backgroundColor: ev.bg, borderLeft: `3px solid ${ev.color}`, '--card-focus-color': ev.color }"
                      :aria-label="eventAriaLabel(ev)"
                      :aria-expanded="selectedId === ev.id"
                      aria-haspopup="dialog"
                      @click.stop="togglePopover(ev.id)"
                      @keydown.enter.prevent.stop="togglePopover(ev.id)"
                      @keydown.space.prevent.stop="togglePopover(ev.id)"
                    >
                      <div class="px-1.5 pt-0.5 h-full flex flex-col overflow-hidden gap-px">
                        <DexText
                          variant="body-2"
                          as="span"
                          class="truncate leading-tight block"
                          :style="{ color: ev.color, fontWeight: 'var(--dex-font-weight-semibold)' }"
                        >{{ ev.title }}</DexText>
                        <DexText
                          v-if="ev.height > 38"
                          variant="caption"
                          as="span"
                          class="truncate leading-tight block opacity-80"
                          :style="{ color: ev.color }"
                        >{{ ev.type }}</DexText>
                        <DexText
                          v-if="ev.height > 54 && ev.memberIds.length"
                          variant="caption"
                          as="span"
                          class="truncate leading-tight block opacity-70"
                          :style="{ color: ev.color }"
                        >{{ ev.memberIds.map(memberName).join(', ') }}</DexText>
                      </div>
                    </div>
                  </template>
                  <template #content>
                    <div class="w-72 rounded-2xl overflow-hidden" @click.stop>
                      <!-- Popover header -->
                      <div class="px-4 py-3 flex items-center justify-between" :style="{ backgroundColor: memberBg(ev.memberIds[0]) }">
                        <div class="flex items-center gap-2 min-w-0">
                          <span class="w-3 h-3 rounded-full flex-shrink-0" :style="{ backgroundColor: memberColor(ev.memberIds[0]) }" />
                          <DexText variant="body-2" :style="{ color: memberColor(ev.memberIds[0]), fontWeight: 'var(--dex-font-weight-semibold)' }">{{ ev.title }}</DexText>
                        </div>
                        <DexIconButton name="x" label="Close" size="dense" class="ml-2 flex-shrink-0" @click="selectedId = null" />
                      </div>
                      <!-- Popover body -->
                      <div class="px-4 py-3 space-y-2.5">
                        <div v-if="popoverFields.time && !ev.allDay && ev.startTime" class="flex items-center gap-2">
                          <svg aria-hidden="true" class="w-4 h-4 flex-shrink-0" :style="{ color: 'var(--dex-fgColor-subtle)' }" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                          <DexText variant="body-2" color="subtle">{{ formatTime(ev.startTime) }}{{ ev.endTime ? ` – ${formatTime(ev.endTime)}` : '' }}</DexText>
                        </div>
                        <div v-if="popoverFields.client && ev.clientName" class="flex items-start gap-2">
                          <svg aria-hidden="true" class="w-4 h-4 flex-shrink-0 mt-0.5" :style="{ color: 'var(--dex-fgColor-subtle)' }" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                          <div>
                            <RouterLink
                              v-if="ev.clientId"
                              :to="`/contacts/contact/${ev.clientId}`"
                              class="hover:underline block"
                              :style="{
                                color: 'var(--dex-color-accent-blue-emphasis)',
                                fontSize: 'var(--dex-text-body2-fontSize)',
                                fontWeight: 'var(--dex-font-weight-semibold)',
                                lineHeight: 'var(--dex-text-body2-lineHeight)',
                              }"
                              @click="selectedId = null"
                            >{{ ev.clientName }}</RouterLink>
                            <span
                              v-else
                              class="block"
                              :style="{
                                color: 'var(--dex-page-fgColor)',
                                fontSize: 'var(--dex-text-body2-fontSize)',
                                fontWeight: 'var(--dex-font-weight-semibold)',
                                lineHeight: 'var(--dex-text-body2-lineHeight)',
                              }"
                            >{{ ev.clientName }}</span>
                            <DexText v-if="ev.clientPhone" variant="x-small" color="subtle">{{ ev.clientPhone }}</DexText>
                          </div>
                        </div>
                        <div v-if="popoverFields.address && ev.clientAddress" class="flex items-start gap-2">
                          <svg aria-hidden="true" class="w-4 h-4 flex-shrink-0 mt-0.5" :style="{ color: 'var(--dex-fgColor-subtle)' }" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                          <DexText variant="body-2" color="subtle">{{ ev.clientAddress }}</DexText>
                        </div>
                        <div v-if="popoverFields.type" class="flex items-center gap-2">
                          <svg aria-hidden="true" class="w-4 h-4 flex-shrink-0" :style="{ color: 'var(--dex-fgColor-subtle)' }" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/></svg>
                          <DexText variant="body-2" color="subtle">{{ ev.type }}</DexText>
                        </div>
                        <div v-if="popoverFields.notes && ev.notes" class="flex items-start gap-2">
                          <svg aria-hidden="true" class="w-4 h-4 flex-shrink-0 mt-0.5" :style="{ color: 'var(--dex-fgColor-subtle)' }" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                          <DexText variant="body-2" color="subtle" :style="{ lineHeight: '1.5' }">{{ ev.notes }}</DexText>
                        </div>
                        <div v-if="popoverFields.members && ev.memberIds.length" class="flex items-start gap-2">
                          <svg aria-hidden="true" class="w-4 h-4 flex-shrink-0 mt-0.5" :style="{ color: 'var(--dex-fgColor-subtle)' }" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                          <div class="flex flex-wrap gap-1">
                            <span
                              v-for="id in ev.memberIds"
                              :key="id"
                              class="px-2 py-0.5 rounded-full"
                              :style="{
                                backgroundColor: memberBg(id),
                                color: memberColor(id),
                                fontSize: 'var(--dex-text-caption-fontSize)',
                                fontWeight: 'var(--dex-font-weight-medium)',
                              }"
                            >{{ memberName(id) }}</span>
                          </div>
                        </div>
                      </div>
                      <div class="px-4 pb-3" :style="{ borderTop: '1px solid var(--dex-borderColor-alpha-subtle)' }">
                        <DexButton
                          variant="transparent"
                          size="sm"
                          leading-icon="refresh-cw"
                          class="w-full mt-2.5"
                          @click.stop="selectedId = null; emit('reassignEvent', ev)"
                        >Reassign</DexButton>
                      </div>
                    </div>
                  </template>
                </DexPopover>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<style scoped>
/* Visible focus rings using the event's own color */
.event-card:focus-visible,
.allday-card:focus-visible {
  outline: 2px solid var(--card-focus-color, #1a73e8);
  outline-offset: 2px;
  border-radius: 4px;
}

/* Day header and reassign button focus */
[role="button"]:focus-visible {
  outline: 2px solid var(--dex-borderColor-primary-emphasis, #1a73e8);
  outline-offset: 1px;
  border-radius: 4px;
}

button:focus-visible {
  outline: 2px solid var(--dex-borderColor-primary-emphasis, #1a73e8);
  outline-offset: 2px;
  border-radius: 4px;
}
.popover-type-link {
  text-decoration: none;
}
.popover-type-link:hover span {
  text-decoration: underline;
}
</style>
