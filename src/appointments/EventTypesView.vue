<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import {
  DexText,
  DexStack,
  DexInline,
  DexBox,
  DexButton,
  DexButtonGroup,
  DexIconButton,
  DexInput,
  DexSelect,
  DexSelectItem,
  DexCheckbox,
  DexTag,
  DexDivider,
  DexDropdownMenu,
  DexDropdownMenuItem,
  DexDropdownMenuSeparator,
  DexConfirmDialog,
  DexConfirmDialogContent,
} from '@thryvlabs/dex-vue'
import type { BookingLink, TeamMember, DayKey, BookingLinkTimeSlot } from './data'

defineOptions({ name: 'EventTypesView' })

const props = defineProps<{
  bookingLinks: BookingLink[]
  teamMembers: TeamMember[]
  view?: 'list' | 'form'
  createTrigger?: number
  editId?: string | null
  editTrigger?: number
}>()

const emit = defineEmits<{
  addType: [link: BookingLink]
  updateType: [id: string, changes: Partial<Omit<BookingLink, 'id'>>]
  removeType: [id: string]
  'update:view': [v: 'list' | 'form']
  'new-appointment': [typeName: string]
}>()

// ── View state (lifted to parent via v-model:view) ────────────────────
const view = computed({
  get: () => props.view ?? 'list',
  set: (v) => emit('update:view', v),
})

// When parent increments createTrigger, open a fresh form
watch(() => props.createTrigger, () => { startCreate() })

// When parent increments editTrigger, open the edit form for editId
watch(() => props.editTrigger, () => {
  const link = props.bookingLinks.find(l => l.id === props.editId)
  if (link) startEdit(link)
})
const editingId = ref<string | null>(null)
const searchQuery = ref('')
const deleteId = ref<string | null>(null)
const selectedDay = ref<DayKey>('mon')

// ── Form state ──────────────────────────────────────────────────────────
interface FormState {
  name: string
  location: 'online' | 'phone' | 'in-person'
  locationOnlineMode: 'my-link' | 'attendee-link'
  preInstructions: string
  duration: string
  daysInAdvance: number
  bufferBefore: string
  bufferAfter: string
  advanceNoticeValue: number
  advanceNoticeUnit: 'minutes' | 'hours' | 'days'
  availabilityByDay: Partial<Record<DayKey, BookingLinkTimeSlot[]>>
  memberIds: string[]
  useBusinessName: boolean
}

function defaultAvailability(): Partial<Record<DayKey, BookingLinkTimeSlot[]>> {
  return {
    mon: [{ startTime: '09:00', endTime: '17:00' }],
    tue: [{ startTime: '09:00', endTime: '17:00' }],
    wed: [{ startTime: '09:00', endTime: '17:00' }],
    thu: [{ startTime: '09:00', endTime: '17:00' }],
    fri: [{ startTime: '09:00', endTime: '17:00' }],
  }
}

function createEmptyForm(): FormState {
  return {
    name: '',
    location: 'in-person',
    locationOnlineMode: 'attendee-link',
    preInstructions: '',
    duration: '60 min',
    daysInAdvance: 60,
    bufferBefore: 'No buffer',
    bufferAfter: 'No buffer',
    advanceNoticeValue: 4,
    advanceNoticeUnit: 'hours',
    availabilityByDay: defaultAvailability(),
    memberIds: [],
    useBusinessName: false,
  }
}

const form = ref<FormState>(createEmptyForm())

// ── Constants ───────────────────────────────────────────────────────────
const DURATIONS = ['15 min', '30 min', '45 min', '60 min', '90 min', '2 hr', '3 hr', '4 hr']
const BUFFER_OPTIONS = ['No buffer', '5 min', '10 min', '15 min', '30 min', '45 min', '60 min']
const NOTICE_UNITS = ['minutes', 'hours', 'days']

const ALL_DAYS: { key: DayKey; short: string }[] = [
  { key: 'sun', short: 'Sun' },
  { key: 'mon', short: 'Mon' },
  { key: 'tue', short: 'Tue' },
  { key: 'wed', short: 'Wed' },
  { key: 'thu', short: 'Thu' },
  { key: 'fri', short: 'Fri' },
  { key: 'sat', short: 'Sat' },
]

// ── List computed ────────────────────────────────────────────────────────
const filteredLinks = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return props.bookingLinks
  return props.bookingLinks.filter(l =>
    l.name.toLowerCase().includes(q) || l.duration.toLowerCase().includes(q)
  )
})

const deleteLink = computed(() =>
  props.bookingLinks.find(l => l.id === deleteId.value) ?? null
)

// ── List actions ─────────────────────────────────────────────────────────
function startCreate() {
  form.value = createEmptyForm()
  editingId.value = null
  selectedDay.value = 'mon'
  view.value = 'form'
}

function startEdit(link: BookingLink) {
  form.value = {
    name:               link.name,
    location:           link.location ?? 'in-person',
    locationOnlineMode: link.locationOnlineMode ?? 'attendee-link',
    preInstructions:    link.preInstructions ?? '',
    duration:           link.duration,
    daysInAdvance:      link.daysInAdvance ?? 60,
    bufferBefore:       link.bufferBefore ?? 'No buffer',
    bufferAfter:        link.bufferAfter  ?? 'No buffer',
    advanceNoticeValue: link.advanceNoticeValue ?? 4,
    advanceNoticeUnit:  link.advanceNoticeUnit  ?? 'hours',
    availabilityByDay:  link.availabilityByDay
      ? JSON.parse(JSON.stringify(link.availabilityByDay))
      : defaultAvailability(),
    memberIds:          [...(link.memberIds ?? [])],
    useBusinessName:    false,
  }
  editingId.value = link.id
  selectedDay.value = 'mon'
  view.value = 'form'
}

function saveForm() {
  if (!form.value.name.trim()) return
  const changes: Partial<Omit<BookingLink, 'id'>> = {
    name:               form.value.name.trim(),
    duration:           form.value.duration,
    location:           form.value.location,
    locationOnlineMode: form.value.locationOnlineMode,
    preInstructions:    form.value.preInstructions,
    daysInAdvance:      form.value.daysInAdvance,
    bufferBefore:       form.value.bufferBefore,
    bufferAfter:        form.value.bufferAfter,
    advanceNoticeValue: form.value.advanceNoticeValue,
    advanceNoticeUnit:  form.value.advanceNoticeUnit,
    availabilityByDay:  form.value.availabilityByDay,
    memberIds:          form.value.memberIds,
  }
  if (editingId.value) {
    emit('updateType', editingId.value, changes)
  } else {
    emit('addType', { id: `bl${Date.now()}`, isNew: true, ...changes } as BookingLink)
  }
  view.value = 'list'
}

function cancelForm() { view.value = 'list' }

function confirmDelete() {
  if (deleteId.value) {
    emit('removeType', deleteId.value)
    deleteId.value = null
  }
}

// ── Availability helpers ─────────────────────────────────────────────────
function hasSlots(day: DayKey) {
  return (form.value.availabilityByDay[day]?.length ?? 0) > 0
}

function addSlot(day: DayKey) {
  if (!form.value.availabilityByDay[day]) {
    form.value.availabilityByDay[day] = []
  }
  form.value.availabilityByDay[day]!.push({ startTime: '09:00', endTime: '17:00' })
  selectedDay.value = day
}

function removeSlot(day: DayKey, i: number) {
  form.value.availabilityByDay[day]?.splice(i, 1)
  if ((form.value.availabilityByDay[day]?.length ?? 0) === 0) {
    delete form.value.availabilityByDay[day]
  }
}

// ── Member helpers ────────────────────────────────────────────────────────
function toggleMember(id: string) {
  const i = form.value.memberIds.indexOf(id)
  i === -1 ? form.value.memberIds.push(id) : form.value.memberIds.splice(i, 1)
}

function membersForLink(link: BookingLink) {
  if (!link.memberIds?.length) return []
  return props.teamMembers.filter(m => link.memberIds!.includes(m.id))
}

function getInitials(name: string) {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
}

// ── URL helper ────────────────────────────────────────────────────────────
function bookingUrl(link: BookingLink) {
  const slug = link.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
  return `summithvac.com/book/${slug}`
}

// ── URL slug for form preview ─────────────────────────────────────────────
const formSlug = computed(() =>
  form.value.name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || '…'
)

// ── Duplicate ─────────────────────────────────────────────────────────────
function duplicateLink(link: BookingLink) {
  const copy: BookingLink = {
    ...JSON.parse(JSON.stringify(link)),
    id: `bl${Date.now()}`,
    name: `${link.name} (copy)`,
    isNew: true,
  }
  emit('addType', copy)
}
</script>

<template>
  <div class="et-view">

    <!-- ═══════════════════════════ LIST VIEW ═══════════════════════════ -->
    <template v-if="view === 'list'">
      <div class="et-list-shell">

        <!-- Page header -->
        <div class="et-page-header">
          <DexStack gap="025">
            <DexText variant="headline-1">Event types</DexText>
            <DexText variant="body-2" color="subtle">
              Create booking pages so customers can schedule appointments online.
            </DexText>
          </DexStack>
          <DexButton variant="outline" leading-icon="add" @click="startCreate">
            New event type
          </DexButton>
        </div>

        <!-- Search -->
        <div class="et-search-row">
          <DexInput
            v-model="searchQuery"
            placeholder="Search event types…"
            leading-icon="search"
            :style="{ maxWidth: '360px' }"
          />
          <DexText v-if="searchQuery && filteredLinks.length === 0" variant="body-2" color="subtle">
            No event types match "{{ searchQuery }}"
          </DexText>
        </div>

        <!-- Empty state -->
        <div v-if="bookingLinks.length === 0" class="et-empty">
          <div class="et-empty-icon">📅</div>
          <DexText variant="headline-3">No event types yet</DexText>
          <DexText variant="body-2" color="subtle">
            Create your first event type to let customers book appointments online.
          </DexText>
          <DexButton variant="solid" leading-icon="add" @click="startCreate">
            New event type
          </DexButton>
        </div>

        <!-- Card list -->
        <div v-else class="et-card-list">
          <div
            v-for="link in filteredLinks"
            :key="link.id"
            class="et-card"
          >
            <!-- Card top: badge + menu -->
            <div class="et-card-toprow">
              <DexTag v-if="link.isNew" color="success" emphasis="high" size="sm">New</DexTag>
              <span v-else />
              <DexDropdownMenu>
                <template #default>
                  <DexIconButton name="more-vertical" :label="`Options for ${link.name}`" size="dense" variant="transparent" />
                </template>
                <template #content>
                  <DexDropdownMenuItem leading-icon="pencil"  title="Edit"      @select="startEdit(link)" />
                  <DexDropdownMenuItem leading-icon="copy"    title="Duplicate" @select="duplicateLink(link)" />
                  <DexDropdownMenuItem leading-icon="link"    title="Copy link"  @select="navigator.clipboard?.writeText(bookingUrl(link))" />
                  <DexDropdownMenuSeparator />
                  <DexDropdownMenuItem leading-icon="trash"   title="Delete"    variant="danger" @select="deleteId = link.id" />
                </template>
              </DexDropdownMenu>
            </div>

            <!-- Title + duration -->
            <DexStack gap="025" :style="{ marginBottom: '12px' }">
              <DexText variant="headline-3">{{ link.name }}</DexText>
              <DexInline gap="100" align-y="center">
                <DexText variant="body-2" color="subtle">{{ link.duration }}</DexText>
                <span v-if="link.location" class="et-location-badge">
                  {{ link.location === 'online' ? '🌐 Online' : link.location === 'phone' ? '📞 Phone' : '📍 In-person' }}
                </span>
              </DexInline>
            </DexStack>

            <!-- Team members -->
            <div v-if="membersForLink(link).length" class="et-members-row">
              <div
                v-for="m in membersForLink(link)"
                :key="m.id"
                class="et-avatar"
                :title="m.name"
                :style="{ backgroundColor: m.bg, color: m.color, borderColor: m.color + '40' }"
              >
                {{ getInitials(m.name) }}
              </div>
              <DexText variant="caption" color="subtle" :style="{ marginLeft: '6px' }">
                {{ membersForLink(link).map(m => m.name.split(' ')[0]).join(', ') }}
              </DexText>
            </div>
            <div v-else class="et-members-row">
              <DexText variant="caption" color="subtle">No team members assigned</DexText>
            </div>

            <!-- Booking URL -->
            <div class="et-url-row">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" style="color: var(--dex-fgColor-link); flex-shrink:0">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
              </svg>
              <span class="et-url-text">{{ bookingUrl(link) }}</span>
            </div>

            <DexDivider :style="{ margin: '12px 0' }" />

            <!-- Action buttons -->
            <DexInline gap="100">
              <DexButton variant="outline" leading-icon="calendar" size="sm" @click.stop="emit('new-appointment', link.name)">
                New appointment
              </DexButton>
              <DexButton variant="transparent" leading-icon="send" size="sm" @click.stop>
                Send invite
              </DexButton>
            </DexInline>
          </div>
        </div>
      </div>
    </template>

    <!-- ════════════════════════ CREATE / EDIT FORM ══════════════════════ -->
    <template v-else>
      <div class="et-form-shell">

        <!-- Form heading -->
        <DexStack gap="025" :style="{ marginBottom: '24px' }">
          <DexText variant="headline-1">
            {{ editingId ? form.name || 'Edit event type' : 'New event type' }}
          </DexText>
          <DexText variant="body-2" color="subtle">
            Configure when and how customers can book this appointment type.
          </DexText>
        </DexStack>

        <!-- ── Section: Basic info ── -->
        <div class="et-form-section">
          <DexStack gap="150">
            <!-- Name -->
            <DexInput
              v-model="form.name"
              label="Name"
              required
              placeholder="e.g. AC Tune-Up"
              @keydown.enter="saveForm"
            />

            <!-- URL preview -->
            <DexStack gap="025">
              <DexText variant="caption" color="subtle">Booking link URL</DexText>
              <div class="et-url-preview">
                https://summithvac.com/book/<strong>{{ formSlug }}</strong>
              </div>
            </DexStack>

            <!-- Use business name -->
            <DexCheckbox
              :checked="form.useBusinessName"
              label="Use my business name instead of personal name in the booking link and booking page."
              @update:checked="form.useBusinessName = $event"
            />

            <!-- Pre-appointment instructions -->
            <DexStack gap="050">
              <label class="et-field-label">Customer instructions</label>
              <textarea
                v-model="form.preInstructions"
                class="et-textarea dex-control dex-text-body-2"
                placeholder="What should customers know before their appointment?"
                rows="3"
              />
            </DexStack>
          </DexStack>
        </div>

        <DexDivider />

        <!-- ── Section: Location ── -->
        <div class="et-form-section">
          <DexStack gap="150">
            <DexText variant="headline-3">Location</DexText>

            <div class="et-seg-group">
              <button
                v-for="opt in [
                  { value: 'online',     label: 'Online'     },
                  { value: 'phone',      label: 'Phone'      },
                  { value: 'in-person',  label: 'In-person'  },
                ]"
                :key="opt.value"
                :class="['et-seg-btn', { active: form.location === opt.value }]"
                @click="form.location = opt.value as typeof form.location"
              >
                {{ opt.label }}
              </button>
            </div>

            <!-- Online sub-options -->
            <DexStack v-if="form.location === 'online'" gap="075" :style="{ paddingLeft: '4px' }">
              <label class="et-radio-row">
                <input type="radio" v-model="form.locationOnlineMode" value="my-link" class="et-radio" />
                <DexText variant="body-2">Use my online meeting link</DexText>
              </label>
              <label class="et-radio-row">
                <input type="radio" v-model="form.locationOnlineMode" value="attendee-link" class="et-radio" />
                <DexText variant="body-2">Ask attendees to use their online meeting link</DexText>
              </label>
            </DexStack>
          </DexStack>
        </div>

        <DexDivider />

        <!-- ── Section: Duration ── -->
        <div class="et-form-section">
          <DexStack gap="150">
            <DexStack gap="025">
              <DexText variant="headline-3">Duration</DexText>
              <DexText variant="body-2" color="subtle">Set the default duration for this appointment type.</DexText>
            </DexStack>
            <DexSelect v-model="form.duration" label="Appointment duration" :style="{ maxWidth: '280px' }">
              <DexSelectItem v-for="d in DURATIONS" :key="d" :value="d" :title="d" />
            </DexSelect>
          </DexStack>
        </div>

        <DexDivider />

        <!-- ── Section: Date range ── -->
        <div class="et-form-section">
          <DexStack gap="150">
            <DexStack gap="025">
              <DexText variant="headline-3">Booking window</DexText>
              <DexText variant="body-2" color="subtle">How many days ahead can customers book?</DexText>
            </DexStack>
            <DexInline gap="100" align-y="center">
              <DexText variant="body-2">Up to</DexText>
              <input
                v-model.number="form.daysInAdvance"
                type="number"
                min="1"
                max="365"
                class="et-num-input dex-control dex-text-body-2"
              />
              <DexText variant="body-2">days in advance</DexText>
            </DexInline>
          </DexStack>
        </div>

        <DexDivider />

        <!-- ── Section: Buffer time ── -->
        <div class="et-form-section">
          <DexStack gap="150">
            <DexStack gap="025">
              <DexText variant="headline-3">Buffer time</DexText>
              <DexText variant="body-2" color="subtle">Block off travel or prep time around each appointment.</DexText>
            </DexStack>
            <DexInline gap="150" stretch>
              <DexSelect v-model="form.bufferBefore" label="Before" :style="{ flex: 1 }">
                <DexSelectItem v-for="b in BUFFER_OPTIONS" :key="b" :value="b" :title="b" />
              </DexSelect>
              <DexSelect v-model="form.bufferAfter" label="After" :style="{ flex: 1 }">
                <DexSelectItem v-for="b in BUFFER_OPTIONS" :key="b" :value="b" :title="b" />
              </DexSelect>
            </DexInline>
          </DexStack>
        </div>

        <DexDivider />

        <!-- ── Section: Advance notice ── -->
        <div class="et-form-section">
          <DexStack gap="150">
            <DexStack gap="025">
              <DexText variant="headline-3">Minimum notice</DexText>
              <DexText variant="body-2" color="subtle">
                How soon before the start time can customers book?
              </DexText>
            </DexStack>
            <DexInline gap="100" align-y="end">
              <div class="et-notice-num">
                <label class="et-field-label">Amount</label>
                <input
                  v-model.number="form.advanceNoticeValue"
                  type="number"
                  min="0"
                  class="et-num-input dex-control dex-text-body-2"
                />
              </div>
              <DexSelect v-model="form.advanceNoticeUnit" label="Unit" :style="{ width: '120px' }">
                <DexSelectItem v-for="u in NOTICE_UNITS" :key="u" :value="u" :title="u" />
              </DexSelect>
              <DexText variant="body-2" :style="{ paddingBottom: '8px' }">before the appointment start time</DexText>
            </DexInline>
          </DexStack>
        </div>

        <DexDivider />

        <!-- ── Section: Availability ── -->
        <div class="et-form-section">
          <DexStack gap="150">
            <DexStack gap="025">
              <DexText variant="headline-3">Availability</DexText>
              <DexText variant="body-2" color="subtle">
                Set the days and times when this event type can be booked.
              </DexText>
            </DexStack>

            <!-- Day tabs -->
            <div class="et-day-tabs">
              <button
                v-for="d in ALL_DAYS"
                :key="d.key"
                :class="['et-day-tab', {
                  active: selectedDay === d.key,
                  'has-slots': hasSlots(d.key),
                }]"
                @click="selectedDay = d.key"
              >
                {{ d.short }}
                <span v-if="hasSlots(d.key)" class="et-day-dot" />
              </button>
            </div>

            <!-- Time slots for selected day -->
            <div class="et-slots-area">
              <div
                v-for="(slot, i) in (form.availabilityByDay[selectedDay] ?? [])"
                :key="i"
                class="et-slot-row"
              >
                <DexStack gap="025" :style="{ flex: 1 }">
                  <label :for="`slot-start-${i}`" class="et-field-label">Start time</label>
                  <input
                    :id="`slot-start-${i}`"
                    v-model="slot.startTime"
                    type="time"
                    class="dex-control dex-text-body-2 et-time-input"
                  />
                </DexStack>
                <DexText variant="body-2" :style="{ paddingTop: '22px' }">–</DexText>
                <DexStack gap="025" :style="{ flex: 1 }">
                  <label :for="`slot-end-${i}`" class="et-field-label">End time</label>
                  <input
                    :id="`slot-end-${i}`"
                    v-model="slot.endTime"
                    type="time"
                    class="dex-control dex-text-body-2 et-time-input"
                  />
                </DexStack>
                <DexIconButton
                  name="trash"
                  label="Remove timeframe"
                  size="dense"
                  variant="transparent"
                  :style="{ marginTop: '22px' }"
                  @click="removeSlot(selectedDay, i)"
                />
              </div>

              <DexButton variant="transparent" size="sm" leading-icon="add" @click="addSlot(selectedDay)">
                {{ hasSlots(selectedDay) ? 'Add time slot' : `Add availability for ${ALL_DAYS.find(d => d.key === selectedDay)?.short}` }}
              </DexButton>

              <div class="et-tz-notice">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                  <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
                </svg>
                Time above displayed in: America/Chicago — CDT
              </div>
            </div>
          </DexStack>
        </div>

        <DexDivider />

        <!-- ── Section: Team members ── -->
        <div class="et-form-section">
          <DexStack gap="150">
            <DexStack gap="025">
              <DexText variant="headline-3">Team members</DexText>
              <DexText variant="body-2" color="subtle">Choose who can accept bookings for this appointment type.</DexText>
            </DexStack>
            <DexInline gap="100" :style="{ flexWrap: 'wrap' }">
              <button
                v-for="m in teamMembers"
                :key="m.id"
                :class="['et-member-chip', { selected: form.memberIds.includes(m.id) }]"
                :style="{
                  '--chip-color': m.color,
                  '--chip-bg': m.bg,
                }"
                @click="toggleMember(m.id)"
              >
                <span class="et-chip-avatar" :style="{ backgroundColor: m.bg, color: m.color }">
                  {{ getInitials(m.name) }}
                </span>
                {{ m.name.split(' ')[0] }} {{ m.name.split(' ').at(-1) }}
                <svg v-if="form.memberIds.includes(m.id)" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
                  <path d="M20 6L9 17l-5-5"/>
                </svg>
              </button>
            </DexInline>
          </DexStack>
        </div>

        <DexDivider />

        <!-- ── Form footer ── -->
        <div class="et-form-footer">
          <DexButton variant="transparent" @click="cancelForm">Cancel</DexButton>
          <DexButton variant="solid" :disabled="!form.name.trim()" @click="saveForm">
            {{ editingId ? 'Save changes' : 'Create event type' }}
          </DexButton>
        </div>

      </div>
    </template>

    <!-- ── Delete confirm ── -->
    <DexConfirmDialog
      :open="deleteId !== null"
      @update:open="v => !v && (deleteId = null)"
    >
      <DexConfirmDialogContent
        title="Delete event type?"
        :description="`'${deleteLink?.name ?? 'This event type'}' will be permanently deleted. Existing appointments keep their label, but it won't match any active event type.`"
        confirm-text="Delete"
        cancel-text="Keep"
        variant="danger"
        @confirm="confirmDelete"
        @cancel="deleteId = null"
      />
    </DexConfirmDialog>

  </div>
</template>

<style scoped>
/* ── Shell ───────────────────────────────────────────────────── */
.et-view {
  flex: 1;
  overflow-y: auto;
  background-color: var(--dex-bgColor-alpha-subtle);
  display: flex;
  flex-direction: column;
}

/* ── List shell ─────────────────────────────────────────────── */
.et-list-shell {
  width: 100%;
  padding: 32px 32px 48px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.et-page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.et-search-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

/* ── Empty state ─────────────────────────────────────────────── */
.et-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 48px 24px;
  text-align: center;
  background: var(--dex-surface-flat-bgColor);
  border: 1px solid var(--dex-borderColor-default);
  border-radius: var(--dex-borderRadius-100);
}
.et-empty-icon { font-size: 40px; line-height: 1; }

/* ── Cards ───────────────────────────────────────────────────── */
.et-card-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
  align-items: start;
}

.et-card {
  background: var(--dex-surface-flat-bgColor);
  border: 1px solid var(--dex-borderColor-default);
  border-radius: var(--dex-borderRadius-100);
  padding: 16px;
  transition: box-shadow 0.15s ease, border-color 0.15s ease;
}
.et-card:hover {
  border-color: var(--dex-borderColor-emphasis);
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
}

.et-card-toprow {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  min-height: 28px;
}

.et-location-badge {
  font-size: 11px;
  color: var(--dex-fgColor-subtle);
  background: var(--dex-bgColor-alpha-subtle);
  border: 1px solid var(--dex-borderColor-alpha-subtle);
  border-radius: 100px;
  padding: 1px 8px;
}

.et-members-row {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 10px;
  flex-wrap: wrap;
}

.et-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 1.5px solid;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 600;
  flex-shrink: 0;
  cursor: default;
}

.et-url-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
}

.et-url-text {
  font-size: 12px;
  color: var(--dex-fgColor-link);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

.et-copy-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--dex-fgColor-subtle);
  display: flex;
  align-items: center;
  padding: 2px;
  border-radius: 4px;
  flex-shrink: 0;
}
.et-copy-btn:hover { color: var(--dex-fgColor-default); background: var(--dex-bgColor-alpha-subtle); }

/* ── Form shell ──────────────────────────────────────────────── */
.et-form-shell {
  width: 100%;
  max-width: 640px;
  margin: 0 auto;
  padding: 28px 24px 64px;
  display: flex;
  flex-direction: column;
  gap: 0;
}


.et-form-section {
  padding: 20px 0;
}

/* ── Field primitives ───────────────────────────────────────── */
.et-field-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--dex-fgColor-default);
  display: block;
  margin-bottom: 4px;
}

.et-textarea {
  width: 100%;
  resize: vertical;
  min-height: 80px;
  border-radius: var(--dex-borderRadius-050);
  padding: var(--dex-spacing-100);
  font-family: inherit;
  box-sizing: border-box;
}

.et-num-input {
  width: 80px;
  text-align: center;
  padding: var(--dex-spacing-075) var(--dex-spacing-100);
  border-radius: var(--dex-borderRadius-050);
}

.et-url-preview {
  font-size: 13px;
  color: var(--dex-fgColor-subtle);
  padding: 8px 12px;
  background: var(--dex-bgColor-alpha-subtle);
  border: 1px solid var(--dex-borderColor-alpha-subtle);
  border-radius: var(--dex-borderRadius-050);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.et-url-preview strong { color: var(--dex-fgColor-link); }

/* ── Location segment ────────────────────────────────────────── */
.et-seg-group {
  display: inline-flex;
  border: 1px solid var(--dex-borderColor-default);
  border-radius: var(--dex-borderRadius-050);
  overflow: hidden;
  background: var(--dex-surface-flat-bgColor);
}
.et-seg-btn {
  flex: 1;
  min-width: 90px;
  padding: 7px 16px;
  border: none;
  border-right: 1px solid var(--dex-borderColor-default);
  background: none;
  cursor: pointer;
  font-size: 14px;
  font-family: inherit;
  color: var(--dex-fgColor-default);
  transition: background 0.12s;
}
.et-seg-btn:last-child { border-right: none; }
.et-seg-btn:hover { background: var(--dex-bgColor-alpha-subtle); }
.et-seg-btn.active {
  background: var(--dex-bgColor-accent-blue-subtle);
  color: var(--dex-color-accent-blue-emphasis);
  font-weight: 600;
}

.et-radio-row {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}
.et-radio {
  width: 16px;
  height: 16px;
  accent-color: var(--dex-color-accent-blue-emphasis);
  cursor: pointer;
  flex-shrink: 0;
}

/* ── Availability day tabs ─────────────────────────────────── */
.et-day-tabs {
  display: flex;
  border: 1px solid var(--dex-borderColor-default);
  border-radius: var(--dex-borderRadius-050);
  overflow: hidden;
  background: var(--dex-surface-flat-bgColor);
}

.et-day-tab {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px 4px 6px;
  border: none;
  border-right: 1px solid var(--dex-borderColor-default);
  background: none;
  cursor: pointer;
  font-size: 13px;
  font-family: inherit;
  color: var(--dex-fgColor-subtle);
  transition: background 0.12s;
}
.et-day-tab:last-child { border-right: none; }
.et-day-tab:hover { background: var(--dex-bgColor-alpha-subtle); color: var(--dex-fgColor-default); }
.et-day-tab.active {
  background: var(--dex-bgColor-accent-blue-subtle);
  color: var(--dex-color-accent-blue-emphasis);
  font-weight: 600;
}
.et-day-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--dex-color-accent-blue-emphasis);
}

/* ── Time slots ─────────────────────────────────────────────── */
.et-slots-area {
  background: var(--dex-bgColor-alpha-subtle);
  border: 1px solid var(--dex-borderColor-alpha-subtle);
  border-radius: var(--dex-borderRadius-075);
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.et-slot-row {
  display: flex;
  align-items: flex-end;
  gap: 10px;
}

.et-time-input {
  width: 100%;
  padding-right: var(--dex-spacing-200);
}

.et-add-slot-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--dex-fgColor-link);
  font-size: 14px;
  font-family: inherit;
  padding: 4px 0;
  font-weight: 500;
  transition: opacity 0.15s;
}
.et-add-slot-btn:hover { opacity: 0.75; }

.et-tz-notice {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  color: var(--dex-fgColor-subtle);
  margin-top: 2px;
}

/* ── Member chips ───────────────────────────────────────────── */
.et-member-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px 6px 6px;
  border: 1.5px solid var(--dex-borderColor-default);
  border-radius: 100px;
  background: var(--dex-surface-flat-bgColor);
  cursor: pointer;
  font-size: 13px;
  font-family: inherit;
  color: var(--dex-fgColor-default);
  transition: border-color 0.12s, background 0.12s;
}
.et-member-chip:hover {
  border-color: var(--chip-color, var(--dex-borderColor-emphasis));
  background: var(--chip-bg, var(--dex-bgColor-alpha-subtle));
}
.et-member-chip.selected {
  border-color: var(--chip-color);
  background: var(--chip-bg);
  font-weight: 500;
}
.et-chip-avatar {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 9px;
  font-weight: 700;
  flex-shrink: 0;
}

/* ── Form footer ─────────────────────────────────────────────── */
.et-form-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 24px;
}
</style>
