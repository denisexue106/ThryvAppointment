<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { DexText, DexPopover, DexButton, DexIconButton, DexBox, DexInline } from '@thryvlabs/dex-vue'
import type { TeamMember, CalendarEvent, PopoverFields } from './data'

defineOptions({ name: 'MonthView' })

const props = defineProps<{
  weekStart: Date
  events: CalendarEvent[]
  teamMembers: TeamMember[]
  popoverFields: PopoverFields
}>()

const emit = defineEmits<{
  openNewEvent:  [date: string]
  reassignEvent: [ev: CalendarEvent]
  showWeekOf:    [date: Date]
}>()

const todayStr = new Date().toISOString().slice(0, 10)

const year = computed(() => props.weekStart.getFullYear())
const month = computed(() => props.weekStart.getMonth())

const calDays = computed<(Date | null)[]>(() => {
  const first = new Date(year.value, month.value, 1)
  const last = new Date(year.value, month.value + 1, 0)
  const startOffset = (first.getDay() + 6) % 7
  const days: (Date | null)[] = Array(startOffset).fill(null)
  for (let d = 1; d <= last.getDate(); d++) {
    days.push(new Date(year.value, month.value, d))
  }
  while (days.length % 7 !== 0) days.push(null)
  return days
})

function dateStr(d: Date) {
  return d.toISOString().slice(0, 10)
}

function eventsForDay(date: string) {
  return props.events.filter(e => e.date === date)
}

function memberColor(id: string) {
  return props.teamMembers.find(m => m.id === id)?.color ?? '#888'
}

function memberBg(id: string) {
  return props.teamMembers.find(m => m.id === id)?.bg ?? '#f5f5f5'
}

function formatTime(t?: string) {
  if (!t) return ''
  const [h, m] = t.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hr = h % 12 || 12
  return `${hr}:${m.toString().padStart(2, '0')} ${ampm}`
}

const MAX_VISIBLE = 2
const selectedId = ref<string | null>(null)

function memberName(id: string) {
  return props.teamMembers.find(m => m.id === id)?.name ?? ''
}

function overflowEvent(date: Date) {
  return eventsForDay(dateStr(date))[MAX_VISIBLE]
}

function togglePopover(id: string) {
  selectedId.value = selectedId.value === id ? null : id
}

function eventAriaLabel(ev: CalendarEvent): string {
  const time = ev.allDay ? 'All day' : ev.startTime ? formatTime(ev.startTime) : ''
  const client = ev.clientName ? `, ${ev.clientName}` : ''
  return `${ev.title}${client}, ${ev.type}${time ? `, ${time}` : ''}. Open details.`
}

function dayAriaLabel(date: Date): string {
  const count = eventsForDay(dateStr(date)).length
  const evStr = count === 0 ? 'No events' : count === 1 ? '1 event' : `${count} events`
  return `${date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} — ${evStr}. Add event.`
}
</script>

<template>
  <div role="region" aria-label="Monthly calendar" class="flex flex-col flex-1 overflow-hidden" :style="{ backgroundColor: 'var(--dex-page-bgColor)' }" @click="selectedId = null">
    <!-- Day-of-week headers -->
    <div class="grid grid-cols-7 flex-shrink-0" :style="{ borderBottom: '1px solid var(--dex-borderColor-alpha-subtle)' }">
      <div
        v-for="label in ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']"
        :key="label"
        class="py-2 text-center"
        :style="{ borderLeft: '1px solid var(--dex-borderColor-alpha-subtle)' }"
      >
        <DexText variant="caption" color="subtle" :style="{ textTransform: 'uppercase', letterSpacing: '0.05em' }">{{ label }}</DexText>
      </div>
    </div>

    <!-- Calendar grid -->
    <div class="flex-1 overflow-y-auto">
      <div class="grid grid-cols-7 h-full" :style="{ gridTemplateRows: `repeat(${calDays.length / 7}, minmax(0, 1fr))` }">
        <div
          v-for="(date, i) in calDays"
          :key="i"
          class="p-1 min-h-[110px] month-cell"
          :class="date ? 'cursor-pointer' : ''"
          :role="date ? 'button' : undefined"
          :tabindex="date ? 0 : undefined"
          :aria-label="date ? dayAriaLabel(date) : undefined"
          :style="{
            borderLeft: '1px solid var(--dex-borderColor-alpha-subtle)',
            borderBottom: '1px solid var(--dex-borderColor-alpha-subtle)',
          }"
          @click="date && emit('openNewEvent', dateStr(date))"
          @keydown.enter.prevent="date && emit('openNewEvent', dateStr(date))"
          @keydown.space.prevent="date && emit('openNewEvent', dateStr(date))"
        >
          <div v-if="date" class="flex flex-col h-full">
            <!-- Date number -->
            <div class="flex justify-center mb-1">
              <div
                :class="[
                  'w-7 h-7 flex items-center justify-center rounded-full',
                  dateStr(date) === todayStr ? 'bg-blue-600' : '',
                ]"
              >
                <DexText
                  variant="caption"
                  as="span"
                  :style="dateStr(date) === todayStr
                    ? { color: 'white', fontWeight: 'var(--dex-font-weight-semibold)' }
                    : { color: 'var(--dex-page-fgColor)', fontWeight: 'var(--dex-font-weight-semibold)' }"
                >{{ date.getDate() }}</DexText>
              </div>
            </div>

            <!-- Events -->
            <div class="flex flex-col gap-0.5 overflow-hidden">
              <DexPopover
                v-for="ev in eventsForDay(dateStr(date)).slice(0, MAX_VISIBLE)"
                :key="ev.id"
                :open="selectedId === ev.id"
                side="right"
                align="start"
                @update:open="(v) => !v && (selectedId = null)"
              >
                <template #default>
                  <div
                    class="event-chip px-2 py-1 rounded-md truncate cursor-pointer hover:opacity-80 transition-opacity"
                    role="button"
                    tabindex="0"
                    :aria-label="eventAriaLabel(ev)"
                    :aria-expanded="selectedId === ev.id"
                    aria-haspopup="dialog"
                    :style="{
                      backgroundColor: memberBg(ev.memberIds[0]),
                      color: memberColor(ev.memberIds[0]),
                      fontSize: 'var(--dex-text-body-2-fontSize)',
                      lineHeight: 'var(--dex-text-body-2-lineHeight)',
                      fontWeight: 'var(--dex-font-weight-medium)',
                      '--chip-focus-color': memberColor(ev.memberIds[0]),
                    }"
                    @click.stop="togglePopover(ev.id)"
                    @keydown.enter.prevent.stop="togglePopover(ev.id)"
                    @keydown.space.prevent.stop="togglePopover(ev.id)"
                  >
                    <span
                      v-if="!ev.allDay && ev.startTime"
                      class="opacity-60 mr-1"
                      :style="{ fontSize: 'var(--dex-text-caption-fontSize)' }"
                    >{{ formatTime(ev.startTime) }}</span>{{ ev.title }}
                  </div>
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
                      >Reassign appointment</DexButton>
                    </div>
                  </div>
                </template>
              </DexPopover>

              <!-- "+N more" → switch to week view for that date -->
              <div
                v-if="eventsForDay(dateStr(date)).length > MAX_VISIBLE"
                class="px-2 py-0.5 cursor-pointer hover:underline overflow-chip"
                role="button"
                tabindex="0"
                :aria-label="`Show ${eventsForDay(dateStr(date)).length - MAX_VISIBLE} more events`"
                :style="{
                  color: 'var(--dex-fgColor-accent-blue, #1a73e8)',
                  fontSize: 'var(--dex-text-body-2-fontSize)',
                  fontWeight: 'var(--dex-font-weight-medium)',
                }"
                @click.stop="emit('showWeekOf', date)"
                @keydown.enter.prevent.stop="emit('showWeekOf', date)"
                @keydown.space.prevent.stop="emit('showWeekOf', date)"
              >+{{ eventsForDay(dateStr(date)).length - MAX_VISIBLE }} more</div>

              <!-- kept as dead template to avoid removing DexPopover dep (still used above) -->
            </div>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<style scoped>
.event-chip:focus-visible {
  outline: 2px solid var(--chip-focus-color, var(--dex-borderColor-primary-emphasis, #1a73e8));
  outline-offset: 1px;
  border-radius: 4px;
}

.overflow-chip:focus-visible {
  outline: 2px solid var(--dex-borderColor-primary-emphasis, #1a73e8);
  outline-offset: 1px;
  border-radius: 4px;
}

.month-cell:focus-visible {
  outline: 2px solid var(--dex-borderColor-primary-emphasis, #1a73e8);
  outline-offset: -2px;
}
.popover-type-link {
  text-decoration: none;
}
.popover-type-link:hover span {
  text-decoration: underline;
}
</style>
