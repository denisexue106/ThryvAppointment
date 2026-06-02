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
  DexDivider,
} from '@thryvlabs/dex-vue'
import type { TeamMember, CalendarEvent, BookingLink, Contact } from './data'

defineOptions({ name: 'NewEventModalB' })

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

// ── Fields ────────────────────────────────────────────────────────────────
const title      = ref('')
const type       = ref<string>(props.initialType ?? props.bookingLinks[0]?.name ?? '')
const clientId   = ref<string>('')
const notes      = ref('')
const assignMode = ref<'anyone' | string>('anyone')
const allDay     = ref(false)

// ── Derived ───────────────────────────────────────────────────────────────
const selectedContact = computed(() =>
  props.contacts.find(c => c.id === clientId.value) ?? null
)
const isTeamMeeting = computed(() => type.value === 'Team Meeting')

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
      const free = props.teamMembers.filter(m => memberFreeAt(m.id, s, e)).map(m => m.id)
      if (free.length > 0) slots.push({ start: fromMins(s), end: fromMins(e), freeMembers: free })
    } else {
      if (memberFreeAt(assignMode.value, s, e))
        slots.push({ start: fromMins(s), end: fromMins(e), freeMembers: [assignMode.value] })
    }
  }
  return slots
})

const selectedSlot = ref<{ start: string; end: string; freeMembers: string[] } | null>(null)

// Auto-select first available slot whenever relevant state changes
watch([() => type.value, () => assignMode.value, allDay], () => {
  if (!allDay.value) selectedSlot.value = availableSlots.value[0] ?? null
}, { immediate: true })

// ── Labels ────────────────────────────────────────────────────────────────
const weekdayLabel = computed(() =>
  new Date(props.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long' })
)
const dateLabel = computed(() =>
  new Date(props.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
)

const isValid = computed(() =>
  title.value.trim().length > 0 && (allDay.value || selectedSlot.value !== null)
)

// ── Save ──────────────────────────────────────────────────────────────────
function save() {
  if (!isValid.value) return
  const contact = selectedContact.value
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
      <DexModalHeading title="New appointment" />

      <DexModalBody>
        <div class="nb-layout">

          <!-- ── Left: Details ─────────────────────────────────────────── -->
          <DexStack gap="200" class="nb-left">

            <!-- Date badge -->
            <DexBox
              padding="100"
              :style="{
                borderRadius: 'var(--dex-borderRadius-050)',
                background: 'var(--dex-bgColor-alpha-subtle)',
                borderLeft: '3px solid var(--dex-borderColor-primary-emphasis)',
                display: 'inline-flex',
                alignSelf: 'flex-start',
              }"
            >
              <DexText variant="caption" weight="semibold">
                {{ weekdayLabel }}, {{ dateLabel }}
              </DexText>
            </DexBox>

            <DexInput
              v-model="title"
              label="Appointment title"
              required
              placeholder="e.g. Furnace Repair, AC Tune-Up"
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
              <div v-if="selectedContact" class="nb-contact-meta">
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
              :rows="3"
            />

          </DexStack>

          <!-- ── Divider ────────────────────────────────────────────────── -->
          <div class="nb-rule" />

          <!-- ── Right: Assign + Schedule ──────────────────────────────── -->
          <DexStack gap="200" class="nb-right">

            <!-- Assign to -->
            <DexStack gap="100">
              <DexText variant="headline-4" weight="semibold">Assign to</DexText>
              <DexList border="stretch">
                <DexListItem
                  title="Anyone available"
                  description="First available team member"
                  :class="{ 'nb-list-selected': assignMode === 'anyone' }"
                  @click="assignMode = 'anyone'"
                >
                  <template #leading>
                    <span class="nb-pick-icon">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                      </svg>
                    </span>
                  </template>
                  <template #trailing>
                    <svg v-if="assignMode === 'anyone'" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true" :style="{ color: 'var(--dex-fgColor-success)' }">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  </template>
                </DexListItem>
                <DexListItem
                  v-for="m in teamMembers"
                  :key="m.id"
                  :title="m.name"
                  :description="m.role"
                  :class="{ 'nb-list-selected': assignMode === m.id }"
                  @click="assignMode = m.id"
                >
                  <template #leading>
                    <span class="nb-member-dot" :style="{ backgroundColor: m.color }" />
                  </template>
                  <template #trailing>
                    <svg v-if="assignMode === m.id" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true" :style="{ color: 'var(--dex-fgColor-success)' }">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  </template>
                </DexListItem>
              </DexList>
            </DexStack>

            <!-- Schedule -->
            <DexStack gap="100">
              <DexInline align-y="center" gap="150">
                <DexText variant="headline-4" weight="semibold">Schedule</DexText>
                <DexInline align-y="center" gap="075">
                  <DexSwitch :checked="allDay" @update:checked="allDay = $event" />
                  <DexText variant="caption" color="subtle">All day</DexText>
                </DexInline>
              </DexInline>

              <template v-if="!allDay">
                <div v-if="availableSlots.length === 0" class="nb-no-slots">
                  <DexText variant="body-2" color="subtle">No available times on this date.</DexText>
                </div>
                <div v-else class="nb-slots-list">
                  <button
                    v-for="(slot, i) in availableSlots"
                    :key="slot.start"
                    class="nb-slot"
                    :class="{ 'nb-slot--selected': selectedSlot?.start === slot.start }"
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
            </DexStack>

          </DexStack>
        </div>
      </DexModalBody>

      <DexModalFooter>
        <DexInline align-x="spread" stretch>
          <DexButton variant="transparent" @click="emit('close')">Cancel</DexButton>
          <DexButton variant="solid" :disabled="!isValid" @click="save">
            Save appointment
          </DexButton>
        </DexInline>
      </DexModalFooter>

    </DexModalContent>
  </DexModal>
</template>

<style scoped>
/* Two-column shell */
.nb-layout {
  display: flex;
  gap: 0;
  align-items: flex-start;
  min-height: 440px;
}
.nb-left {
  flex: 1.05;
  padding-right: 24px;
}
.nb-rule {
  width: 1px;
  background: var(--dex-borderColor-alpha-subtle);
  align-self: stretch;
  flex-shrink: 0;
}
.nb-right {
  flex: 0.95;
  padding-left: 24px;
}

/* Contact metadata */
.nb-contact-meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px 10px;
  background: var(--dex-bgColor-alpha-subtle);
  border: 1px solid var(--dex-borderColor-alpha-subtle);
  border-radius: var(--dex-borderRadius-050);
}

/* Assign-to list */
.nb-list-selected {
  background: var(--dex-bgColor-accent-blue-subtle) !important;
}
.nb-pick-icon {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: var(--dex-bgColor-alpha-subtle);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: var(--dex-fgColor-subtle);
}
.nb-member-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
  display: inline-block;
}

/* Time slots */
.nb-slots-list {
  display: flex;
  flex-direction: column;
  gap: 5px;
  max-height: 220px;
  overflow-y: auto;
  padding-right: 2px;
}
.nb-slot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-radius: var(--dex-borderRadius-050);
  border: 1.5px solid var(--dex-borderColor-alpha-subtle);
  background: var(--dex-surface-flat-bgColor);
  cursor: pointer;
  font-family: inherit;
  text-align: left;
  width: 100%;
  transition: border-color 0.12s, background 0.12s;
}
.nb-slot:hover {
  border-color: var(--dex-borderColor-primary-emphasis);
  background: var(--dex-bgColor-accent-blue-subtle);
}
.nb-slot--selected {
  border-color: var(--dex-borderColor-primary-emphasis);
  background: var(--dex-bgColor-accent-blue-subtle);
}
.nb-no-slots {
  padding: 16px;
  border-radius: var(--dex-borderRadius-050);
  background: var(--dex-bgColor-alpha-subtle);
  text-align: center;
}
</style>
