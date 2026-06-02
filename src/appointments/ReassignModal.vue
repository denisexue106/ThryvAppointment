<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import {
  DexModal,
  DexModalContent,
  DexModalHeading,
  DexModalBody,
  DexModalFooter,
  DexButton,
  DexButtonGroup,
  DexSelect,
  DexSelectItem,
  DexInput,
  DexText,
  DexStack,
  DexInline,
  DexInlineAlert,
  DexDropdownMenu,
  DexDropdownMenuRadioGroup,
  DexDropdownMenuRadioItem,
} from '@thryvlabs/dex-vue'
import type { TeamMember, CalendarEvent } from './data'
import { getAffectedEvents, detectConflicts } from './useReassignment'

defineOptions({ name: 'ReassignModal' })

const props = defineProps<{
  teamMembers: TeamMember[]
  events: CalendarEvent[]
  defaultFromId?: string
  defaultDate?: string
}>()

const emit = defineEmits<{
  close: []
  confirm: [params: {
    fromId: string
    toId: string
    affected: CalendarEvent[]
    conflictIds: Set<string>
    skipConflicts: boolean
  }]
}>()

const today = new Date().toISOString().slice(0, 10)

const fromId       = ref(props.defaultFromId ?? '')
const toId         = ref('')
const mode         = ref<'event' | 'single' | 'range' | 'future'>('single')
const singleDate   = ref(props.defaultDate ?? today)
const startDate    = ref(props.defaultDate ?? today)
const endDate      = ref(props.defaultDate ?? today)
const selectedEventId = ref('')

const DATE_MODE_OPTIONS = [
  { value: 'event',  label: 'Specific appointment' },
  { value: 'single', label: 'Single date' },
  { value: 'range',  label: 'Date range' },
  { value: 'future', label: 'All future events' },
] as const
const skipConflicts = ref(true)

// clear toId if it matches the new fromId
watch(fromId, v => { if (v === toId.value) toId.value = '' })

const toOptions = computed(() =>
  props.teamMembers.filter(m => m.id !== fromId.value),
)

const selectedEvent = computed(() =>
  props.events.find(e => e.id === selectedEventId.value),
)

const effectiveStart = computed(() => {
  if (mode.value === 'event')  return selectedEvent.value?.date ?? ''
  if (mode.value === 'single') return singleDate.value
  if (mode.value === 'future') return today
  return startDate.value
})
const effectiveEnd = computed(() => {
  if (mode.value === 'event')  return selectedEvent.value?.date ?? ''
  if (mode.value === 'single') return singleDate.value
  if (mode.value === 'future') return '9999-12-31'
  return endDate.value
})

const affectedEvents = computed(() => {
  if (!fromId.value || !effectiveStart.value || !effectiveEnd.value) return []
  if (effectiveEnd.value < effectiveStart.value) return []
  return getAffectedEvents(
    props.events, fromId.value, effectiveStart.value, effectiveEnd.value,
  )
})

const conflictIds = computed<Set<string>>(() => {
  if (!toId.value || !affectedEvents.value.length) return new Set()
  return detectConflicts(props.events, toId.value, affectedEvents.value)
})

const toProcessCount = computed(() =>
  skipConflicts.value
    ? affectedEvents.value.filter(e => !conflictIds.value.has(e.id)).length
    : affectedEvents.value.length,
)

const canConfirm = computed(() =>
  !!fromId.value &&
  !!toId.value &&
  fromId.value !== toId.value &&
  toProcessCount.value > 0,
)

const fromMember = computed(() => props.teamMembers.find(m => m.id === fromId.value))
const toMember   = computed(() => props.teamMembers.find(m => m.id === toId.value))

const confirmLabel = computed(() => {
  if (!canConfirm.value) return 'Reassign appointments'
  const n = toProcessCount.value
  return `Reassign ${n} appointment${n !== 1 ? 's' : ''}`
})

function formatDate(d: string): string {
  return new Date(d + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  })
}

function formatTime(t?: string): string {
  if (!t) return ''
  const [h, m] = t.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hr   = h % 12 || 12
  return `${hr}:${m.toString().padStart(2, '0')} ${ampm}`
}

function handleConfirm() {
  emit('confirm', {
    fromId: fromId.value,
    toId: toId.value,
    affected: affectedEvents.value,
    conflictIds: conflictIds.value,
    skipConflicts: skipConflicts.value,
  })
}
</script>

<template>
  <DexModal :open="true" @update:open="(v) => { if (!v) emit('close') }">
    <DexModalContent size="md">
      <DexModalHeading title="Reassign appointments" />

      <DexModalBody>
        <DexStack gap="300" stretch>

          <!-- ── Staff selects ─────────────────────────────────── -->
          <DexInline gap="150" stretch align-y="end">
            <DexSelect
              v-model="fromId"
              label="From"
              placeholder="Select a staff member"
              :style="{ flex: 1 }"
            >
              <DexSelectItem
                v-for="m in teamMembers"
                :key="m.id"
                :value="m.id"
                :title="m.name"
              />
            </DexSelect>

            <!-- Transfer arrow -->
            <div class="flex-shrink-0 flex items-end pb-2">
              <svg class="w-4 h-4" :style="{ color: 'var(--dex-fgColor-subtle)' }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/>
              </svg>
            </div>

            <DexSelect
              v-model="toId"
              label="To"
              placeholder="Select a staff member"
              :disabled="!fromId"
              :style="{ flex: 1 }"
            >
              <DexSelectItem
                v-for="m in toOptions"
                :key="m.id"
                :value="m.id"
                :title="m.name"
              />
            </DexSelect>
          </DexInline>

          <!-- ── Date mode dropdown ───────────────────────────── -->
          <DexStack gap="050">
            <DexText variant="headline-4" as="label">Date scope</DexText>
            <DexDropdownMenu>
              <template #default>
                <DexButton
                  variant="outline"
                  trailing-icon="chevron-down"
                  :style="{ width: '100%', justifyContent: 'space-between' }"
                >
                  {{ DATE_MODE_OPTIONS.find(o => o.value === mode)?.label }}
                </DexButton>
              </template>
              <template #content>
                <DexDropdownMenuRadioGroup
                  :model-value="mode"
                  @update:model-value="v => mode = v as typeof mode"
                >
                  <DexDropdownMenuRadioItem
                    v-for="o in DATE_MODE_OPTIONS"
                    :key="o.value"
                    :value="o.value"
                    :title="o.label"
                  />
                </DexDropdownMenuRadioGroup>
              </template>
            </DexDropdownMenu>
          </DexStack>

          <!-- Specific event picker -->
          <DexSelect
            v-if="mode === 'event'"
            v-model="selectedEventId"
            label="Event"
            placeholder="Select an event"
            :disabled="!fromId"
          >
            <DexSelectItem
              v-for="ev in props.events.filter(e => e.memberIds.includes(fromId) && e.date >= today)"
              :key="ev.id"
              :value="ev.id"
              :title="ev.title"
              :description="ev.date"
            />
          </DexSelect>

          <!-- Single date -->
          <DexInput
            v-else-if="mode === 'single'"
            v-model="singleDate"
            type="date"
            label="Date"
          />

          <!-- Date range -->
          <DexInline v-else-if="mode === 'range'" gap="150" stretch>
            <DexInput v-model="startDate" type="date" label="Start date" />
            <DexInput v-model="endDate" type="date" label="End date" />
          </DexInline>

          <!-- All future: no extra input needed -->

          <!-- ── Preview ───────────────────────────────────────── -->
          <div v-if="fromId && effectiveStart">
            <DexStack gap="150">

              <!-- Nothing found -->
              <DexInlineAlert
                v-if="affectedEvents.length === 0"
                variant="default"
                :leading-icon="true"
              >
                No upcoming appointments found for
                <strong>{{ fromMember?.name ?? 'this staff member' }}</strong>
                in the selected period.
              </DexInlineAlert>

              <template v-else>

                <!-- Conflict warning -->
                <DexInlineAlert
                  v-if="toId && conflictIds.size > 0"
                  variant="warning"
                  :leading-icon="true"
                >
                  {{ conflictIds.size }} appointment{{ conflictIds.size !== 1 ? 's' : '' }}
                  conflict{{ conflictIds.size !== 1 ? '' : 's' }} with
                  <strong>{{ toMember?.name ?? 'the selected staff member' }}</strong>'s existing schedule.
                  <template #footer>
                    <DexInline gap="100">
                      <DexButton
                        :variant="skipConflicts ? 'solid' : 'outline'"
                        size="sm"
                        @click="skipConflicts = true"
                      >Skip {{ conflictIds.size }} conflict{{ conflictIds.size !== 1 ? 's' : '' }}</DexButton>
                      <DexButton
                        :variant="!skipConflicts ? 'solid' : 'outline'"
                        size="sm"
                        @click="skipConflicts = false"
                      >Force reassign all</DexButton>
                    </DexInline>
                  </template>
                </DexInlineAlert>

                <!-- Summary line -->
                <DexText variant="body-2" color="subtle">
                  <template v-if="toId">
                    <strong>{{ toProcessCount }}</strong>
                    appointment{{ toProcessCount !== 1 ? 's' : '' }} will be reassigned to
                    <strong>{{ toMember?.name }}</strong>{{ skipConflicts && conflictIds.size ? `, ${conflictIds.size} conflict${conflictIds.size !== 1 ? 's' : ''} skipped` : '' }}.
                  </template>
                  <template v-else>
                    <strong>{{ affectedEvents.length }}</strong>
                    upcoming appointment{{ affectedEvents.length !== 1 ? 's' : '' }} found for
                    <strong>{{ fromMember?.name }}</strong>.
                    Select a "To" staff member to continue.
                  </template>
                </DexText>

                <!-- Appointment list -->
                <div
                  class="overflow-y-auto rounded-lg"
                  :style="{
                    maxHeight: '220px',
                    border: '1px solid var(--dex-borderColor-alpha-subtle)',
                  }"
                >
                  <div
                    v-for="ev in affectedEvents"
                    :key="ev.id"
                    class="flex items-center gap-2.5 px-3 py-2"
                    :style="{
                      borderBottom: '1px solid var(--dex-borderColor-alpha-subtle)',
                      backgroundColor: (skipConflicts && conflictIds.has(ev.id))
                        ? 'var(--dex-bgColor-alpha-subtle)'
                        : 'var(--dex-page-bgColor)',
                      opacity: (skipConflicts && conflictIds.has(ev.id)) ? '0.5' : '1',
                      transition: 'opacity 0.15s ease',
                    }"
                  >
                    <!-- Member color dot -->
                    <span
                      class="w-2 h-2 rounded-full flex-shrink-0"
                      :style="{ backgroundColor: fromMember?.color ?? '#888' }"
                    />
                    <!-- Date -->
                    <DexText variant="x-small" color="subtle" :style="{ flexShrink: 0, width: '84px' }">
                      {{ formatDate(ev.date) }}
                    </DexText>
                    <!-- Time -->
                    <DexText variant="x-small" color="subtle" :style="{ flexShrink: 0, width: '68px' }">
                      {{ ev.allDay ? 'All day' : formatTime(ev.startTime) }}
                    </DexText>
                    <!-- Title -->
                    <DexText
                      variant="x-small"
                      :style="{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }"
                    >{{ ev.title }}</DexText>
                    <!-- Conflict badge -->
                    <span
                      v-if="toId && conflictIds.has(ev.id)"
                      class="text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0"
                      :style="{ backgroundColor: '#fce8e6', color: '#c5221f' }"
                    >Conflict</span>
                  </div>
                </div>

              </template>
            </DexStack>
          </div>

        </DexStack>
      </DexModalBody>

      <DexModalFooter>
        <DexInline align-x="right" stretch>
          <DexButtonGroup>
            <DexButton variant="transparent" @click="emit('close')">Cancel</DexButton>
            <DexButton
              variant="solid"
              :disabled="!canConfirm"
              @click="handleConfirm"
            >{{ confirmLabel }}</DexButton>
          </DexButtonGroup>
        </DexInline>
      </DexModalFooter>

    </DexModalContent>
  </DexModal>
</template>
