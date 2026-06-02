<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { DexText, DexTag, DexButton } from '@thryvlabs/dex-vue'
import type { TeamMember, CalendarEvent } from './data'

defineOptions({ name: 'EventView' })

const props = defineProps<{
  weekStart: Date
  events: CalendarEvent[]
  teamMembers: TeamMember[]
}>()

const emit = defineEmits<{
  openNewEvent: [date: string]
}>()

const todayStr = new Date().toISOString().slice(0, 10)

const groupedEvents = computed(() => {
  const map = new Map<string, CalendarEvent[]>()
  const sorted = [...props.events].sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date)
    if (a.allDay && !b.allDay) return -1
    if (!a.allDay && b.allDay) return 1
    if (a.startTime && b.startTime) return a.startTime.localeCompare(b.startTime)
    return 0
  })
  for (const ev of sorted) {
    if (!map.has(ev.date)) map.set(ev.date, [])
    map.get(ev.date)!.push(ev)
  }
  return [...map.entries()].map(([date, events]) => ({ date, events }))
})

function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T12:00:00')
  if (dateStr === todayStr) return 'Today — ' + d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
}

function formatTime(t?: string) {
  if (!t) return ''
  const [h, m] = t.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hr = h % 12 || 12
  return `${hr}:${m.toString().padStart(2, '0')} ${ampm}`
}

function memberColor(id: string) {
  return props.teamMembers.find(m => m.id === id)?.color ?? '#888'
}

function memberBg(id: string) {
  return props.teamMembers.find(m => m.id === id)?.bg ?? '#f5f5f5'
}

function memberName(id: string) {
  return props.teamMembers.find(m => m.id === id)?.name ?? ''
}

const router = useRouter()
</script>

<template>
  <div class="flex-1 overflow-y-auto" :style="{ backgroundColor: 'var(--dex-page-bgColor)' }">
    <div v-if="groupedEvents.length === 0" class="flex flex-col items-center justify-center h-full gap-3 py-20 text-center px-8">
      <svg aria-hidden="true" style="width:40px;height:40px;color:var(--dex-fgColor-subtle)" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
      <DexText variant="headline-3">No appointments</DexText>
      <DexText variant="body-2" color="subtle">No appointments match the current filters.</DexText>
    </div>

    <div v-for="group in groupedEvents" :key="group.date">
      <!-- Date header -->
      <div
        class="sticky top-0 px-6 py-2.5 z-10"
        :style="{
          backgroundColor: 'var(--dex-surface-recessed-bgColor)',
          borderBottom: '1px solid var(--dex-borderColor-alpha-subtle)',
          borderTop: '1px solid var(--dex-borderColor-alpha-subtle)',
        }"
      >
        <DexText
          variant="body-2"
          weight="semibold"
          :style="group.date === todayStr ? { color: '#1a73e8' } : {}"
        >{{ formatDate(group.date) }}</DexText>
      </div>

      <!-- Events -->
      <div
        v-for="ev in group.events"
        :key="ev.id"
        role="button"
        tabindex="0"
        class="flex items-start gap-4 px-6 py-3 cursor-pointer transition-all hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--dex-borderColor-primary-emphasis)]"
        :style="{ borderBottom: '1px solid var(--dex-borderColor-alpha-subtle)' }"
        :aria-label="`${ev.title}, ${ev.type}, ${ev.allDay ? 'All day' : ev.startTime}`"
        @click="emit('openNewEvent', ev.date)"
        @keydown.enter.prevent="emit('openNewEvent', ev.date)"
        @keydown.space.prevent="emit('openNewEvent', ev.date)"
      >
        <!-- Color bar -->
        <div class="w-1 self-stretch rounded-full flex-shrink-0 mt-0.5 min-h-[20px]" :style="{ backgroundColor: memberColor(ev.memberIds[0]) }" />

        <!-- Time -->
        <div class="w-32 flex-shrink-0 pt-0.5">
          <DexText variant="body-2" color="subtle">
            {{ ev.allDay ? 'All day' : `${formatTime(ev.startTime)}${ev.endTime ? ` – ${formatTime(ev.endTime)}` : ''}` }}
          </DexText>
        </div>

        <!-- Details -->
        <div class="flex-1 min-w-0">
          <DexText variant="body-2" weight="medium">{{ ev.title }}</DexText>
          <div v-if="ev.clientName" class="flex items-center gap-1 mt-0.5">
            <DexButton
              variant="transparent"
              size="sm"
              :style="{ padding: '0', height: 'auto', minHeight: 'unset' }"
              @click.stop="router.push('/contacts')"
            >{{ ev.clientName }}</DexButton>
            <DexText v-if="ev.clientPhone" variant="x-small" color="subtle">· {{ ev.clientPhone }}</DexText>
          </div>
          <DexText v-if="ev.service" variant="x-small" color="subtle">{{ ev.service }}</DexText>
          <DexText v-if="ev.notes" variant="x-small" color="subtle" :style="{ marginTop: '4px', lineHeight: '1.5', display: 'block' }">{{ ev.notes }}</DexText>
          <div v-if="ev.memberIds.length" class="flex flex-wrap gap-1 mt-1.5">
            <span
              v-for="id in ev.memberIds"
              :key="id"
              class="text-[10px] px-2 py-0.5 rounded-full font-medium"
              :style="{ backgroundColor: memberBg(id), color: memberColor(id) }"
            >{{ memberName(id) }}</span>
          </div>
        </div>

        <!-- Type badge -->
        <DexTag emphasis="low" :style="{ flexShrink: '0' }">{{ ev.type }}</DexTag>
      </div>
    </div>
  </div>
</template>
