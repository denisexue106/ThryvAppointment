<script setup lang="ts">
import { ref } from 'vue'
import {
  DexText,
  DexInline,
  DexButton,
  DexIconButton,
  DexStack,
  DexTag,
  DexDropdownMenu,
  DexDropdownMenuItem,
  DexDropdownMenuSeparator,
  DexModal,
  DexModalContent,
  DexModalHeading,
  DexModalBody,
} from '@thryvlabs/dex-vue'
import type { BookingLink, PopoverFields } from './data'

defineOptions({ name: 'CalendarTopBarB' })

const props = defineProps<{
  weekStart: Date
  viewMode: 'week' | 'month' | 'event' | 'event-types' | 'team'
  bookingLinks: BookingLink[]
  popoverFields: PopoverFields
  startHour: number
  endHour: number
}>()

const emit = defineEmits<{
  navigate: [delta: number]
  goToday: []
  addAppointment: []
  'update:viewMode': [mode: 'week' | 'month' | 'event' | 'event-types' | 'team']
  'update:popoverFields': [fields: PopoverFields]
  'update:startHour': [hour: number]
  'update:endHour': [hour: number]
  'new-event-type': []
  reassign: []
  connectCalendars: []
  manageTeam: []
  'back-to-et-list': []
}>()

const settingsOpen = ref(false)

const HOURS = Array.from({ length: 24 }, (_, i) => i)

function formatHourLabel(h: number) {
  if (h === 0) return '12:00 AM'
  if (h < 12) return `${h}:00 AM`
  if (h === 12) return '12:00 PM'
  return `${h - 12}:00 PM`
}

const POPOVER_FIELD_LABELS: { key: keyof PopoverFields; label: string }[] = [
  { key: 'time',    label: 'Time' },
  { key: 'client',  label: 'Customer' },
  { key: 'address', label: 'Address' },
  { key: 'type',    label: 'Event type' },
  { key: 'notes',   label: 'Notes' },
  { key: 'members', label: 'Team members' },
]

function toggleField(key: keyof PopoverFields) {
  emit('update:popoverFields', { ...props.popoverFields, [key]: !props.popoverFields[key] })
}
</script>

<template>
  <!-- ── Page-level header ─────────────────────────────────────────────── -->
  <div class="tbB-header">
    <DexText variant="display-2" as="h1" class="tbB-title">Appointments</DexText>

    <DexInline gap="100" align-y="center">
      <!-- Send invite dropdown -->
      <DexDropdownMenu align="end">
        <template #default>
          <DexButton variant="outline" trailing-icon="chevron-down">
            Send invite
          </DexButton>
        </template>
        <template #content>
          <DexDropdownMenuItem
            v-for="link in bookingLinks"
            :key="link.id"
            :title="link.name"
            :description="link.duration"
            leading-icon="send"
          />
        </template>
      </DexDropdownMenu>

      <!-- Book now -->
      <DexButton variant="solid" @click="emit('addAppointment')">
        Book now
      </DexButton>

      <!-- Settings dropdown -->
      <DexDropdownMenu align="end">
        <template #default>
          <DexIconButton name="more-vertical" label="More options" />
        </template>
        <template #content>
          <DexDropdownMenuItem
            leading-icon="contact-user"
            title="Team member management"
            description="Add, edit or remove team members"
            @select="emit('manageTeam')"
          />
          <DexDropdownMenuItem
            leading-icon="settings"
            title="Calendar view settings"
            description="Appointment cards and viewing hours"
            @select="settingsOpen = true"
          />
        </template>
      </DexDropdownMenu>
    </DexInline>
  </div>

  <!-- Calendar view settings modal -->
  <DexModal v-model:open="settingsOpen">
    <DexModalContent>
      <DexModalHeading title="Calendar view settings" />
      <DexModalBody>
        <DexStack gap="300">

          <!-- Appointment cards -->
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

          <!-- Viewing hours -->
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
.tbB-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px 12px;
  border-bottom: 1px solid var(--dex-borderColor-alpha-subtle);
  flex-shrink: 0;
  background: var(--dex-surface-flat-bgColor, #fff);
  z-index: 10;
}
.tbB-title {
  line-height: 1.2;
}
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
