<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import {
  DexModal,
  DexModalContent,
  DexModalHeading,
  DexModalBody,
  DexModalFooter,
  DexInput,
  DexTextarea,
  DexButton,
  DexSelect,
  DexSelectItem,
  DexStack,
  DexInline,
  DexText,
  DexBox,
  DexSwitch,
  DexTag,
  DexList,
  DexListItem,
} from '@thryvlabs/dex-vue'
import type { TeamMember, CalendarEvent, BookingLink, Contact } from './data'

defineOptions({ name: 'NewEventModal' })

const props = defineProps<{
  date: string
  initialType?: string
  events: CalendarEvent[]
  teamMembers: TeamMember[]
  bookingLinks: BookingLink[]
  contacts: Contact[]
}>()

const emit = defineEmits<{
  close: []
  save: [event: CalendarEvent]
}>()

// ── Step ─────────────────────────────────────────────────────────────────
const step = ref<1 | 2>(1)

// ── Step-1 fields ─────────────────────────────────────────────────────────
const title    = ref('')
const type     = ref<string>(props.initialType ?? props.bookingLinks[0]?.name ?? '')
const clientId = ref<string>('')
const notes    = ref('')
// 'anyone' or a specific member id
const assignMode = ref<'anyone' | string>('anyone')

const selectedContact = computed(() =>
  props.contacts.find(c => c.id === clientId.value) ?? null
)
const isTeamMeeting = computed(() => type.value === 'Team Meeting')
const step1Valid    = computed(() => title.value.trim().length > 0)


// ── Step-2 fields ─────────────────────────────────────────────────────────
const allDay = ref(false)

// ── Helpers ───────────────────────────────────────────────────────────────
function toMins(t: string) {
  const [h, m] = t.split(':').map(Number); return h * 60 + m
}
function fromMins(n: number) {
  return `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`
}
function fmt12(t: string) {
  const [h, m] = t.split(':').map(Number)
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
}
function parseDurMins(dur: string): number {
  const hr  = dur.match(/(\d+)\s*hr/)
  const min = dur.match(/(\d+)\s*min/)
  return (hr ? +hr[1] * 60 : 0) + (min ? +min[1] : 0) || 60
}

function memberFreeAt(memberId: string, slotStart: number, slotEnd: number) {
  return !props.events.some(ev =>
    ev.date === props.date && !ev.allDay && ev.startTime && ev.endTime &&
    ev.memberIds.includes(memberId) &&
    toMins(ev.startTime!) < slotEnd && toMins(ev.endTime!) > slotStart
  )
}

// ── Available slots ───────────────────────────────────────────────────────
const availableSlots = computed(() => {
  const link = props.bookingLinks.find(l => l.name === type.value)
  const dur  = parseDurMins(link?.duration ?? '60 min')
  const slots: { start: string; end: string; freeMembers: string[] }[] = []

  for (let s = 8 * 60; s + dur <= 18 * 60; s += 30) {
    const e = s + dur

    if (assignMode.value === 'anyone') {
      // Slot available if at least one member is free
      const free = props.teamMembers
        .filter(m => memberFreeAt(m.id, s, e))
        .map(m => m.id)
      if (free.length > 0) slots.push({ start: fromMins(s), end: fromMins(e), freeMembers: free })
    } else {
      // Slot available only if the specific member is free
      if (memberFreeAt(assignMode.value, s, e)) {
        slots.push({ start: fromMins(s), end: fromMins(e), freeMembers: [assignMode.value] })
      }
    }
  }
  return slots
})

const selectedSlot = ref<{ start: string; end: string; freeMembers: string[] } | null>(null)

watch([() => step.value, () => type.value, () => assignMode.value], () => {
  if (step.value === 2 && !allDay.value)
    selectedSlot.value = availableSlots.value[0] ?? null
}, { deep: true, immediate: true })

watch(allDay, v => {
  if (!v && step.value === 2) selectedSlot.value = availableSlots.value[0] ?? null
})

// ── Navigation ────────────────────────────────────────────────────────────
function goNext() { if (step1Valid.value) step.value = 2 }
function goBack() { step.value = 1 }

// ── Labels ────────────────────────────────────────────────────────────────
const weekdayLabel = computed(() =>
  new Date(props.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long' })
)
const dateLabel = computed(() =>
  new Date(props.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
)
const assignLabel = computed(() => {
  if (assignMode.value === 'anyone') return 'Anyone available'
  return props.teamMembers.find(m => m.id === assignMode.value)?.name ?? ''
})

const step2Valid = computed(() => allDay.value || selectedSlot.value !== null)

// ── Save ──────────────────────────────────────────────────────────────────
function save() {
  if (!step1Valid.value || !step2Valid.value) return
  const contact = selectedContact.value
  // For 'anyone', assign to all free members at selected slot; otherwise specific member
  const finalMemberIds = assignMode.value === 'anyone'
    ? (selectedSlot.value?.freeMembers ?? [])
    : [assignMode.value]
  emit('save', {
    id: `e${Date.now()}`,
    title: title.value.trim(),
    date: props.date,
    startTime: allDay.value ? undefined : selectedSlot.value?.start,
    endTime:   allDay.value ? undefined : selectedSlot.value?.end,
    allDay: allDay.value,
    type: type.value,
    memberIds: finalMemberIds,
    clientId:      contact?.id,
    clientName:    contact?.name,
    clientPhone:   contact?.phone,
    clientAddress: contact?.address,
    notes: notes.value.trim() || undefined,
  })
}
</script>

<template>
  <DexModal :open="true" @update:open="(v) => { if (!v) emit('close') }">
    <DexModalContent size="lg">
      <DexModalHeading :title="step === 1 ? 'New appointment' : 'Select a time'" />

      <DexModalBody>

        <!-- ══════════════════════ STEP 1 ══════════════════════ -->
        <template v-if="step === 1">
          <DexInline align-y="center" gap="100" :style="{ marginBottom: '16px' }">
            <span class="nem-dot-step nem-dot-step--active" />
            <span class="nem-dot-step" />
            <DexText variant="caption" color="subtle">Step 1 of 2 · Details</DexText>
          </DexInline>

          <div class="nem-step1-wrap">
            <div class="nem-s1-layout">

              <!-- Left: form fields -->
              <DexStack gap="200" class="nem-s1-left">

                <DexInput
                  v-model="title"
                  label="Appointment title"
                  required
                  placeholder="e.g. Furnace Repair, AC Tune-Up"
                  @keydown.enter="goNext"
                />

                <DexSelect v-model="type" label="Event type">
                  <DexSelectItem
                    v-for="link in bookingLinks"
                    :key="link.id"
                    :value="link.name"
                    :title="link.name"
                    :description="link.duration"
                  />
                </DexSelect>

                <DexStack v-if="!isTeamMeeting" gap="075">
                  <DexSelect v-model="clientId" label="Customer">
                    <DexSelectItem value="" title="No customer" description="Internal or unassigned" />
                    <DexSelectItem
                      v-for="c in contacts"
                      :key="c.id"
                      :value="c.id"
                      :title="c.name"
                    />
                  </DexSelect>
                  <!-- Metadata card shown when a customer is selected -->
                  <div v-if="selectedContact" class="nem-contact-meta">
                    <DexInline gap="075" align-y="center">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" style="flex-shrink:0;color:var(--dex-fgColor-subtle)">
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.8 19.8 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
                      </svg>
                      <DexText variant="caption" color="subtle">{{ selectedContact.phone }}</DexText>
                    </DexInline>
                    <DexInline gap="075" align-y="center">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" style="flex-shrink:0;color:var(--dex-fgColor-subtle)">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                      </svg>
                      <DexText variant="caption" color="subtle">{{ selectedContact.address }}</DexText>
                    </DexInline>
                  </div>
                </DexStack>

                <DexTextarea
                  v-model="notes"
                  label="Notes"
                  placeholder="Add any details the team should know before this appointment…"
                  :rows="4"
                />

              </DexStack>

              <!-- Divider -->
              <div class="nem-s1-rule" />

              <!-- Right: Assign to -->
              <DexStack gap="100" class="nem-s1-right">
                <DexText variant="headline-4" weight="semibold">Assign to</DexText>
                <DexList border="stretch">
                  <!-- Anyone available -->
                  <DexListItem
                    title="Anyone available"
                    description="First available team member"
                    :class="{ 'nem-list-selected': assignMode === 'anyone' }"
                    @click="assignMode = 'anyone'"
                  >
                    <template #leading>
                      <span class="nem-pick-icon">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                        </svg>
                      </span>
                    </template>
                    <template #trailing>
                      <svg v-if="assignMode === 'anyone'" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true" :style="{ color: 'var(--dex-fgColor-success)' }">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    </template>
                  </DexListItem>
                  <!-- Individual members -->
                  <DexListItem
                    v-for="m in teamMembers"
                    :key="m.id"
                    :title="m.name"
                    :description="m.role"
                    :class="{ 'nem-list-selected': assignMode === m.id }"
                    @click="assignMode = m.id"
                  >
                    <template #leading>
                      <span class="nem-member-dot" :style="{ backgroundColor: m.color }" />
                    </template>
                    <template #trailing>
                      <svg v-if="assignMode === m.id" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true" :style="{ color: 'var(--dex-fgColor-success)' }">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    </template>
                  </DexListItem>
                </DexList>
              </DexStack>

            </div>
          </div>
        </template>

        <!-- ══════════════════════ STEP 2 ══════════════════════ -->
        <template v-else>
          <DexInline align-y="center" gap="100" :style="{ marginBottom: '16px' }">
            <span class="nem-dot-step nem-dot-step--done" />
            <span class="nem-dot-step nem-dot-step--active" />
            <DexText variant="caption" color="subtle">Step 2 of 2 · Schedule</DexText>
          </DexInline>

          <div class="nem-step2-wrap">

            <!-- Date + assign summary -->
            <DexInline align-y="stretch" gap="100" stretch :style="{ marginBottom: '16px' }">
              <DexBox
                padding="150"
                :style="{
                  flex: 1,
                  borderRadius: 'var(--dex-borderRadius-050)',
                  background: 'var(--dex-bgColor-alpha-subtle)',
                  borderLeft: '3px solid var(--dex-borderColor-primary-emphasis)',
                }"
              >
                <DexStack gap="000">
                  <DexText variant="caption" color="subtle" weight="semibold">{{ weekdayLabel }}</DexText>
                  <DexText variant="headline-2">{{ dateLabel }}</DexText>
                </DexStack>
              </DexBox>
              <DexBox
                padding="150"
                :style="{
                  flex: 1,
                  borderRadius: 'var(--dex-borderRadius-050)',
                  background: 'var(--dex-bgColor-alpha-subtle)',
                }"
              >
                <DexStack gap="025">
                  <DexText variant="caption" color="subtle" weight="semibold">Assigned to</DexText>
                  <DexInline align-y="center" gap="075">
                    <span
                      v-if="assignMode !== 'anyone'"
                      class="nem-member-dot"
                      :style="{ backgroundColor: teamMembers.find(m => m.id === assignMode)?.color }"
                    />
                    <DexText variant="body-2" weight="semibold">{{ assignLabel }}</DexText>
                  </DexInline>
                </DexStack>
              </DexBox>
            </DexInline>

            <!-- All-day switch -->
            <DexInline align-y="center" gap="150" :style="{ marginBottom: '16px' }">
              <DexSwitch :checked="allDay" @update:checked="allDay = $event" />
              <DexText variant="body-2">All day</DexText>
            </DexInline>

            <!-- Time slots -->
            <template v-if="!allDay">
              <DexText variant="headline-4" weight="semibold" :style="{ marginBottom: '8px' }">Available times</DexText>

              <div v-if="availableSlots.length === 0" class="nem-no-slots">
                <DexText variant="body-2" color="subtle">No available times for {{ assignLabel }} on this date.</DexText>
              </div>

              <div v-else class="nem-slots-list">
                <button
                  v-for="(slot, i) in availableSlots"
                  :key="slot.start"
                  class="nem-slot"
                  :class="{ 'nem-slot--selected': selectedSlot?.start === slot.start }"
                  @click="selectedSlot = slot"
                >
                  <DexText variant="body-2" weight="semibold">
                    {{ fmt12(slot.start) }} – {{ fmt12(slot.end) }}
                  </DexText>
                  <DexTag v-if="i === 0" color="success" emphasis="low" size="sm">
                    Next available
                  </DexTag>
                </button>
              </div>
            </template>

          </div>
        </template>

      </DexModalBody>

      <!-- Footer -->
      <DexModalFooter>
        <DexInline align-x="spread" stretch>
          <template v-if="step === 1">
            <DexButton variant="transparent" @click="emit('close')">Cancel</DexButton>
            <DexButton variant="solid" :disabled="!step1Valid" trailing-icon="chevron-right" @click="goNext">
              Continue
            </DexButton>
          </template>
          <template v-else>
            <DexButton variant="transparent" leading-icon="chevron-left" @click="goBack">Back</DexButton>
            <DexButton variant="solid" :disabled="!step2Valid" @click="save">
              Save appointment
            </DexButton>
          </template>
        </DexInline>
      </DexModalFooter>

    </DexModalContent>
  </DexModal>
</template>

<style scoped>
/* Step 1 two-column layout */
.nem-step1-wrap {
  /* full width of modal body */
}
.nem-s1-layout {
  display: flex;
  gap: 0;
  align-items: flex-start;
}
.nem-s1-left {
  flex: 1.1;
  padding-right: 24px;
}
.nem-s1-rule {
  width: 1px;
  background: var(--dex-borderColor-alpha-subtle);
  align-self: stretch;
  flex-shrink: 0;
}
.nem-s1-right {
  flex: 0.9;
  padding-left: 24px;
}

/* Step 2 centered narrow */
.nem-step2-wrap {
  max-width: 520px;
  margin: 0 auto;
}

/* Step indicator dots */
.nem-dot-step {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
  background: var(--dex-borderColor-default);
  transition: all 0.2s;
}
.nem-dot-step--active {
  width: 20px;
  border-radius: 4px;
  background: var(--dex-borderColor-primary-emphasis);
}
.nem-dot-step--done {
  background: var(--dex-fgColor-success);
}

/* List-based assign-to */
.nem-list-selected {
  background: var(--dex-bgColor-accent-blue-subtle) !important;
}
.nem-pick-icon {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--dex-bgColor-alpha-subtle);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: var(--dex-fgColor-subtle);
}
/* Contact metadata card */
.nem-contact-meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px 10px;
  background: var(--dex-bgColor-alpha-subtle);
  border: 1px solid var(--dex-borderColor-alpha-subtle);
  border-radius: var(--dex-borderRadius-050);
}

.nem-member-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
  display: inline-block;
}

/* Time slots */
.nem-slots-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 300px;
  overflow-y: auto;
  padding-right: 2px;
}
.nem-slot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-radius: var(--dex-borderRadius-050);
  border: 1.5px solid var(--dex-borderColor-alpha-subtle);
  background: var(--dex-surface-flat-bgColor);
  cursor: pointer;
  font-family: inherit;
  text-align: left;
  width: 100%;
  transition: border-color 0.12s, background 0.12s;
}
.nem-slot:hover {
  border-color: var(--dex-borderColor-primary-emphasis);
  background: var(--dex-bgColor-accent-blue-subtle);
}
.nem-slot--selected {
  border-color: var(--dex-borderColor-primary-emphasis);
  background: var(--dex-bgColor-accent-blue-subtle);
}
.nem-no-slots {
  padding: 20px;
  border-radius: var(--dex-borderRadius-050);
  background: var(--dex-bgColor-alpha-subtle);
  text-align: center;
}
</style>
