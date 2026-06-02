<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { DexText, DexPopover, DexButton, DexIconButton, DexBox, DexInline } from '@thryvlabs/dex-vue'
import type { TeamMember, CalendarEvent, PopoverFields } from './data'

defineOptions({ name: 'DayView' })

const props = defineProps<{
  weekStart: Date        // used as "currentDay" in day view
  events: CalendarEvent[]
  teamMembers: TeamMember[]
  popoverFields: PopoverFields
  startHour: number
  endHour: number
}>()

const emit = defineEmits<{
  openNewEvent:  [date: string]
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

const dayDate = computed(() => props.weekStart)

const dayStr = computed(() => dayDate.value.toISOString().slice(0, 10))

const dayLabel = computed(() =>
  dayDate.value.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
)

const isToday = computed(() => dayStr.value === todayStr)

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

// ── All-day events ───────────────────────────────────────────────────
const allDayEvents = computed(() =>
  props.events.filter(e => e.allDay && e.date === dayStr.value)
)

// ── Timed event layout ───────────────────────────────────────────────
interface PositionedEvent extends CalendarEvent {
  top: number; height: number; leftPct: number; widthPct: number
  color: string; bg: string
}

function eventsOverlap(a: CalendarEvent, b: CalendarEvent) {
  const aStart = timeToMins(a.startTime!); const aEnd = a.endTime ? timeToMins(a.endTime) : aStart + 30
  const bStart = timeToMins(b.startTime!); const bEnd = b.endTime ? timeToMins(b.endTime) : bStart + 30
  return aStart < bEnd && aEnd > bStart
}

const timedEvents = computed<PositionedEvent[]>(() => {
  const dayEvents = props.events.filter(e => !e.allDay && e.date === dayStr.value && e.startTime)
  if (!dayEvents.length) return []

  const sorted = [...dayEvents].sort((a, b) => timeToMins(a.startTime!) - timeToMins(b.startTime!))
  const laneEnds: number[] = []
  const withLanes = sorted.map(ev => {
    const start = timeToMins(ev.startTime!)
    const end   = ev.endTime ? timeToMins(ev.endTime) : start + 30
    let lane = laneEnds.findIndex(e => e <= start)
    if (lane === -1) { lane = laneEnds.length; laneEnds.push(end) } else laneEnds[lane] = end
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

    const concurrent  = withLanes.filter(({ ev: o }) => eventsOverlap(ev, o)).sort((a, b) => a.lane - b.lane)
    const groupSize   = concurrent.length
    const myPosition  = concurrent.findIndex(({ ev: o }) => o.id === ev.id)

    return { ...ev, top, height, leftPct: (myPosition / groupSize) * 100, widthPct: 100 / groupSize,
      color: primary?.color ?? '#1a73e8', bg: primary?.bg ?? '#e8f0fe' }
  })
})

// ── Helpers ──────────────────────────────────────────────────────────
function memberName(id: string) { return props.teamMembers.find(m => m.id === id)?.name ?? '' }
function memberColor(id: string) { return props.teamMembers.find(m => m.id === id)?.color ?? '#888' }
function memberBg(id: string)    { return props.teamMembers.find(m => m.id === id)?.bg    ?? '#f5f5f5' }

function formatTime(t?: string) {
  if (!t) return ''
  const [h, m] = t.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'; const hr = h % 12 || 12
  return `${hr}:${m.toString().padStart(2, '0')} ${ampm}`
}

const selectedId = ref<string | null>(null)
function togglePopover(id: string) { selectedId.value = selectedId.value === id ? null : id }
</script>

<template>
  <div class="day-view" role="region" aria-label="Daily calendar" @click="selectedId = null">

    <!-- Day header -->
    <div class="dv-header">
      <!-- Empty corner above time labels -->
      <div class="dv-time-gutter" />
      <!-- Day column header -->
      <div class="dv-col-head">
        <DexText variant="caption" color="subtle" :style="{ textTransform: 'uppercase', letterSpacing: '0.05em' }">
          {{ dayDate.toLocaleDateString('en-US', { weekday: 'short' }) }}
        </DexText>
        <div
          class="dv-date-num"
          :class="{ 'dv-date-today': isToday }"
        >
          <DexText
            variant="headline-1"
            :style="{ color: isToday ? '#fff' : 'var(--dex-page-fgColor)', fontWeight: 'var(--dex-font-weight-semibold)', lineHeight: '1' }"
          >{{ dayDate.getDate() }}</DexText>
        </div>
      </div>
    </div>

    <!-- All-day row -->
    <div v-if="allDayEvents.length > 0" class="dv-allday-row">
      <div class="dv-time-gutter dv-allday-label">
        <DexText variant="x-small" color="subtle">All Day</DexText>
      </div>
      <div class="dv-allday-col">
        <div
          v-for="ev in allDayEvents"
          :key="ev.id"
          class="dv-allday-chip"
          :style="{ backgroundColor: memberBg(ev.memberIds[0]), color: memberColor(ev.memberIds[0]) }"
        >
          <DexText variant="caption" :style="{ color: 'inherit', fontWeight: 'var(--dex-font-weight-medium)' }">
            {{ ev.title }}
          </DexText>
        </div>
      </div>
    </div>

    <!-- Time grid -->
    <div class="dv-grid-wrap">
      <div class="dv-grid">
        <!-- Time labels + hour lines -->
        <template v-for="h in HOURS" :key="h">
          <div class="dv-hour-label">
            <DexText variant="x-small" color="subtle">{{ formatHour(h) }}</DexText>
          </div>
          <div
            class="dv-hour-line"
            @click="emit('openNewEvent', dayStr)"
          />
        </template>

        <!-- Current time indicator -->
        <div
          v-if="isToday && currentTimePx >= 0"
          class="dv-now-line"
          :style="{ top: currentTimePx + 'px' }"
        />

        <!-- Event column -->
        <div class="dv-events-col">
          <DexPopover
            v-for="ev in timedEvents"
            :key="ev.id"
            :open="selectedId === ev.id"
            side="right"
            align="start"
            @update:open="(v) => !v && (selectedId = null)"
          >
            <template #default>
              <div
                class="dv-event"
                :style="{
                  top: ev.top + 'px',
                  height: ev.height + 'px',
                  left: ev.leftPct + '%',
                  width: ev.widthPct + '%',
                  backgroundColor: ev.bg,
                  borderLeftColor: ev.color,
                  color: ev.color,
                }"
                @click.stop="togglePopover(ev.id)"
              >
                <DexText variant="caption" :style="{ color: 'inherit', fontWeight: 'var(--dex-font-weight-semibold)', lineHeight: '1.3', overflow: 'hidden' }">
                  {{ ev.title }}
                </DexText>
                <DexText v-if="ev.height > 36" variant="x-small" :style="{ color: 'inherit', opacity: 0.8 }">
                  {{ formatTime(ev.startTime) }}{{ ev.endTime ? ' – ' + formatTime(ev.endTime) : '' }}
                </DexText>
                <DexText v-if="ev.height > 52 && ev.memberIds.length" variant="x-small" :style="{ color: 'inherit', opacity: 0.75 }">
                  {{ ev.memberIds.map(memberName).join(', ') }}
                </DexText>
              </div>
            </template>
            <template #content>
              <div class="dv-popover" @click.stop>
                <!-- Header -->
                <DexBox padding="150" :style="{ borderBottom: '1px solid var(--dex-borderColor-alpha-subtle)', backgroundColor: memberBg(ev.memberIds[0]) }">
                  <DexInline align-y="center" align-x="spread" stretch>
                    <DexInline align-y="center" gap="100">
                      <span class="dv-pop-dot" :style="{ backgroundColor: memberColor(ev.memberIds[0]) }" />
                      <DexText variant="body-2" :style="{ color: memberColor(ev.memberIds[0]), fontWeight: 'var(--dex-font-weight-semibold)' }">{{ ev.title }}</DexText>
                    </DexInline>
                    <DexIconButton name="x" label="Close" size="dense" @click="selectedId = null" />
                  </DexInline>
                </DexBox>
                <!-- Body -->
                <div class="dv-pop-body">
                  <div v-if="popoverFields.time && !ev.allDay && ev.startTime" class="dv-pop-row">
                    <svg class="dv-pop-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                    <DexText variant="body-2" color="subtle">{{ formatTime(ev.startTime) }}{{ ev.endTime ? ` – ${formatTime(ev.endTime)}` : '' }}</DexText>
                  </div>
                  <div v-if="popoverFields.client && ev.clientName" class="dv-pop-row">
                    <svg class="dv-pop-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                    <div>
                      <RouterLink v-if="ev.clientId" :to="`/contacts/contact/${ev.clientId}`" class="dv-pop-link">{{ ev.clientName }}</RouterLink>
                      <span v-else class="dv-pop-name">{{ ev.clientName }}</span>
                      <DexText v-if="ev.clientPhone" variant="x-small" color="subtle">{{ ev.clientPhone }}</DexText>
                    </div>
                  </div>
                  <div v-if="popoverFields.address && ev.clientAddress" class="dv-pop-row">
                    <svg class="dv-pop-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                    <DexText variant="body-2" color="subtle">{{ ev.clientAddress }}</DexText>
                  </div>
                  <div v-if="popoverFields.type" class="dv-pop-row">
                    <svg class="dv-pop-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/></svg>
                    <a :href="'https://summithvac.com/book/' + ev.type.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')" target="_blank" class="popover-type-link">
                      <DexText variant="body-2" color="primary">{{ ev.type }}</DexText>
                    </a>
                  </div>
                  <div v-if="popoverFields.notes && ev.notes" class="dv-pop-row">
                    <svg class="dv-pop-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                    <DexText variant="body-2" color="subtle">{{ ev.notes }}</DexText>
                  </div>
                  <div v-if="popoverFields.members && ev.memberIds.length" class="dv-pop-row">
                    <svg class="dv-pop-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                    <div class="dv-pop-chips">
                      <span v-for="id in ev.memberIds" :key="id" class="dv-pop-chip" :style="{ backgroundColor: memberBg(id), color: memberColor(id) }">{{ memberName(id) }}</span>
                    </div>
                  </div>
                </div>
                <div class="dv-pop-footer">
                  <DexButton variant="transparent" size="sm" leading-icon="refresh-cw" class="w-full" @click.stop="selectedId = null; emit('reassignEvent', ev)">Reassign</DexButton>
                </div>
              </div>
            </template>
          </DexPopover>
        </div>
      </div>
    </div>

  </div>
</template>

<style scoped>
.day-view {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--dex-page-bgColor);
}

/* Header */
.dv-header {
  display: flex;
  border-bottom: 1px solid var(--dex-borderColor-alpha-subtle);
  flex-shrink: 0;
}
.dv-time-gutter {
  width: 56px;
  min-width: 56px;
  flex-shrink: 0;
}
.dv-col-head {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px 0 6px;
  gap: 4px;
}
.dv-date-num {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.dv-date-today {
  background-color: #1a73e8;
}

/* All-day row */
.dv-allday-row {
  display: flex;
  border-bottom: 1px solid var(--dex-borderColor-alpha-subtle);
  flex-shrink: 0;
  min-height: 32px;
}
.dv-allday-label {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding-right: 8px;
}
.dv-allday-col {
  flex: 1;
  padding: 4px 8px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.dv-allday-chip {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: var(--dex-text-caption-fontSize);
  font-weight: var(--dex-font-weight-medium);
}

/* Grid */
.dv-grid-wrap {
  flex: 1;
  overflow-y: auto;
}
.dv-grid {
  display: grid;
  grid-template-columns: 56px 1fr;
  position: relative;
}
.dv-hour-label {
  height: 64px;
  display: flex;
  align-items: flex-start;
  justify-content: flex-end;
  padding: 0 8px;
  padding-top: 2px;
  border-right: 1px solid var(--dex-borderColor-alpha-subtle);
  color: var(--dex-fgColor-subtle);
}
.dv-hour-line {
  height: 64px;
  border-bottom: 1px solid var(--dex-borderColor-alpha-subtle);
  cursor: pointer;
  transition: background 0.1s;
}
.dv-hour-line:hover {
  background: var(--dex-bgColor-transparent-hover);
}

/* Current time */
.dv-now-line {
  position: absolute;
  left: 56px;
  right: 0;
  height: 2px;
  background: #1a73e8;
  z-index: 3;
  pointer-events: none;
}
.dv-now-line::before {
  content: '';
  position: absolute;
  left: -4px;
  top: -4px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #1a73e8;
}

/* Events column */
.dv-events-col {
  grid-column: 2;
  grid-row: 1 / -1;
  position: absolute;
  inset: 0;
  left: 56px;
  pointer-events: none;
}

.dv-event {
  position: absolute;
  border-left: 3px solid;
  border-radius: 4px;
  padding: 4px 6px;
  overflow: hidden;
  cursor: pointer;
  pointer-events: all;
  transition: opacity 0.12s;
  box-sizing: border-box;
}
.dv-event:hover { opacity: 0.85; }

/* Popover */
.dv-popover {
  width: 288px;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 4px 16px rgba(0,0,0,.15);
  background: var(--dex-surface-flat-bgColor);
}
.dv-pop-dot { width: 12px; height: 12px; border-radius: 50%; flex-shrink: 0; }
.dv-pop-body { padding: 12px 16px; display: flex; flex-direction: column; gap: 10px; }
.dv-pop-row { display: flex; align-items: flex-start; gap: 8px; }
.dv-pop-icon { width: 16px; height: 16px; flex-shrink: 0; color: var(--dex-fgColor-subtle); margin-top: 2px; }
.dv-pop-link { color: var(--dex-color-accent-blue-emphasis); font-size: var(--dex-text-body2-fontSize); font-weight: var(--dex-font-weight-semibold); text-decoration: none; }
.dv-pop-link:hover { text-decoration: underline; }
.dv-pop-name { font-size: var(--dex-text-body2-fontSize); font-weight: var(--dex-font-weight-semibold); }
.dv-pop-chips { display: flex; flex-wrap: wrap; gap: 4px; }
.dv-pop-chip { padding: 2px 8px; border-radius: 999px; font-size: var(--dex-text-caption-fontSize); font-weight: var(--dex-font-weight-medium); }
.dv-pop-footer { padding: 8px 16px 12px; border-top: 1px solid var(--dex-borderColor-alpha-subtle); }
.popover-type-link { text-decoration: none; }
.popover-type-link:hover span { text-decoration: underline; }
</style>
