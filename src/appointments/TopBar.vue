<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  DexBox,
  DexInline,
  DexStack,
  DexButton,
  DexButtonGroup, // used in chevron nav group
  DexIconButton,
  DexText,
  DexDropdownMenu,
  DexDropdownMenuItem,
  DexModal,
  DexModalContent,
  DexModalHeading,
  DexModalBody,
  DexTag,
} from '@thryvlabs/dex-vue'
import type { PopoverFields } from './data'

defineOptions({ name: 'CalendarTopBar' })

const props = defineProps<{
  weekStart: Date
  viewMode: 'week' | 'month' | 'event' | 'event-types' | 'team'
  popoverFields: PopoverFields
  startHour: number
  endHour: number
  etFormOpen?: boolean
}>()

const emit = defineEmits<{
  navigate: [delta: number]
  goToday: []
  addAppointment: []
  'update:viewMode': [mode: 'week' | 'month' | 'event' | 'event-types' | 'team']
  'update:popoverFields': [fields: PopoverFields]
  'update:startHour': [hour: number]
  'update:endHour': [hour: number]
  reassign: []
  connectCalendars: []
  'back-to-et-list': []
  'new-event-type': []
}>()

const settingsOpen = ref(false)

const HOURS = Array.from({ length: 24 }, (_, i) => i)

function formatHourLabel(h: number) {
  if (h === 0) return '12:00 AM'
  if (h < 12) return `${h}:00 AM`
  if (h === 12) return '12:00 PM'
  return `${h - 12}:00 PM`
}

const POPOVER_FIELD_LABELS: { key: keyof PopoverFields; label: string; description: string }[] = [
  { key: 'time',    label: 'Time',         description: 'Show the start and end time of the appointment.' },
  { key: 'client',  label: 'Customer',     description: 'Display the customer\'s name on the event card.' },
  { key: 'address', label: 'Address',      description: 'Show the service location address.' },
  { key: 'type',    label: 'Event type',   description: 'Display the type of appointment.' },
  { key: 'notes',   label: 'Notes',        description: 'Include appointment notes on the card.' },
  { key: 'members', label: 'Team members', description: 'Show all assigned team members.' },
]

function toggleField(key: keyof PopoverFields) {
  emit('update:popoverFields', { ...props.popoverFields, [key]: !props.popoverFields[key] })
}

const isCalendarView = computed(() => props.viewMode !== 'event-types' && props.viewMode !== 'team')

const weekLabel = computed(() => {
  if (props.viewMode === 'month') {
    return props.weekStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  }
  if (props.viewMode === 'event') {
    return 'All Events'
  }
  if (props.viewMode === 'event-types') {
    return ''
  }
  return props.weekStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
})

const VIEW_OPTIONS = [
  { value: 'week',  label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'event', label: 'Event' },
] as const

const viewLabel = computed(
  () => VIEW_OPTIONS.find(o => o.value === props.viewMode)?.label ?? 'Week'
)


</script>

<template>
  <DexBox
    padding="150"
    :style="{ borderBottom: '1px solid var(--dex-borderColor-alpha-subtle)', flexShrink: '0', zIndex: '10' }"
  >
    <DexInline align-y="center" align-x="spread" stretch :style="{ rowGap: '24px' }">
      <!-- Left: navigation -->
      <DexInline align-y="center" gap="200">
        <template v-if="isCalendarView">
          <DexButton variant="transparent" @click="emit('goToday')">Today</DexButton>
          <DexButtonGroup>
            <DexIconButton name="chevron-left" label="Previous week" @click="emit('navigate', -1)" />
            <DexIconButton name="chevron-right" label="Next week" @click="emit('navigate', 1)" />
          </DexButtonGroup>
          <DexText variant="headline-2">{{ weekLabel }}</DexText>
        </template>
        <template v-else>
          <DexButton
            v-if="viewMode === 'event-types' && etFormOpen"
            variant="transparent"
            leading-icon="chevron-left"
            @click="emit('back-to-et-list')"
          >
            Event types
          </DexButton>
          <DexButton
            v-else
            variant="transparent"
            leading-icon="chevron-left"
            @click="emit('update:viewMode', 'week')"
          >
            Calendar
          </DexButton>
        </template>
      </DexInline>

      <!-- Right: view selector + CTA -->
      <DexInline align-y="center" gap="200">
        <!-- View selector (hidden on full-screen management views) -->
        <DexDropdownMenu v-if="isCalendarView">
          <template #default>
            <DexButton variant="outline" trailing-icon="chevron-down">
              {{ viewLabel }}
            </DexButton>
          </template>
          <template #content>
            <DexDropdownMenuItem
              v-for="o in VIEW_OPTIONS"
              :key="o.value"
              :title="o.label"
              @select="emit('update:viewMode', o.value)"
            />
          </template>
        </DexDropdownMenu>

        <DexDropdownMenu>
          <template #default>
            <DexButton variant="solid" leading-icon="add" trailing-icon="chevron-down">
              Create
            </DexButton>
          </template>
          <template #content>
            <DexDropdownMenuItem
              leading-icon="calendar"
              title="New appointment"
              description="Schedule a new appointment"
              @select="emit('addAppointment')"
            />
            <DexDropdownMenuItem
              leading-icon="link"
              title="New event type"
              description="Create a booking page with availability"
              @select="emit('new-event-type')"
            />
          </template>
        </DexDropdownMenu>

        <!-- More options dropdown -->
        <DexDropdownMenu>
          <template #default>
            <DexIconButton name="more-vertical" label="More options" />
          </template>
          <template #content>
            <DexDropdownMenuItem
              leading-icon="settings"
              title="Calendar settings"
              @select="settingsOpen = true"
            />
            <DexDropdownMenuItem
              leading-icon="shuffle"
              title="Reassign appointments"
              @select="emit('reassign')"
            />
          </template>
        </DexDropdownMenu>
      </DexInline>
    </DexInline>
  </DexBox>

  <!-- Calendar Settings modal -->
  <DexModal v-model:open="settingsOpen">
    <DexModalContent>
      <DexModalHeading title="Calendar settings" />
      <DexModalBody>
        <DexStack gap="300">

          <!-- Event Details -->
          <DexStack gap="100">
            <DexStack gap="025">
              <DexText variant="headline-3">Appointment cards</DexText>
              <DexText variant="body-2" color="subtle">Choose what to show on each appointment card.</DexText>
            </DexStack>
            <DexInline gap="100" :style="{ flexWrap: 'wrap' }">
              <DexTag
                v-for="f in POPOVER_FIELD_LABELS"
                :key="f.key"
                emphasis="low"
                :color="popoverFields[f.key] ? 'success' : undefined"
                :leading-icon="popoverFields[f.key] ? 'check' : undefined"
                @click="toggleField(f.key)"
                :style="{ cursor: 'pointer' }"
              >
                {{ f.label }}
              </DexTag>
            </DexInline>
          </DexStack>


          <!-- Calendar Viewing Hours -->
          <DexStack gap="100">
            <DexStack gap="025">
              <DexText variant="headline-3">Viewing hours</DexText>
              <DexText variant="body-2" color="subtle">Set the time range shown in your week view.</DexText>
            </DexStack>
            <DexInline gap="150" align-y="center">
              <DexStack gap="050" :style="{ flex: '1' }">
                <DexText variant="caption">Start time</DexText>
                <select
                  class="view-hours-select"
                  :value="startHour"
                  @change="emit('update:startHour', +($event.target as HTMLSelectElement).value)"
                >
                  <option v-for="h in HOURS" :key="h" :value="h">{{ formatHourLabel(h) }}</option>
                </select>
              </DexStack>
              <DexStack gap="050" :style="{ flex: '1' }">
                <DexText variant="caption">End time</DexText>
                <select
                  class="view-hours-select"
                  :value="endHour"
                  @change="emit('update:endHour', +($event.target as HTMLSelectElement).value)"
                >
                  <option v-for="h in HOURS" :key="h" :value="h">{{ formatHourLabel(h) }}</option>
                </select>
              </DexStack>
            </DexInline>
          </DexStack>

        </DexStack>
      </DexModalBody>
    </DexModalContent>
  </DexModal>
</template>

<style scoped>

.view-hours-select {
  width: 100%;
  padding: 6px 8px;
  border-radius: var(--dex-borderRadius-050);
  border: 1px solid var(--dex-borderColor-default);
  background-color: var(--dex-surface-flat-bgColor);
  color: var(--dex-page-fgColor);
  font-size: var(--dex-text-body2-fontSize);
  font-family: inherit;
  cursor: pointer;
  appearance: auto;
}
.view-hours-select:focus {
  outline: 2px solid var(--dex-borderColor-primary-emphasis);
  outline-offset: 1px;
}
</style>
