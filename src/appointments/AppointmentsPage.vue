<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useNotification, DexText, DexIcon, DexIconButton, DexButton, DexInline, DexDropdownMenu, DexDropdownMenuItem, DexDropdownMenuSeparator } from '@thryvlabs/dex-vue'
import { teamMembers as seedMembers, seedEvents, seedContacts, DEFAULT_BOOKING_LINKS, type TeamMember, type CalendarEvent, type BookingLink, type Contact, type PopoverFields, DEFAULT_POPOVER_FIELDS } from './data'
import TopBar from './TopBar.vue'
import TopBarB from './TopBarB.vue'
import Sidebar from './Sidebar.vue'
import SidebarB from './SidebarB.vue'
import WeekView from './WeekView.vue'
import DayView from './DayView.vue'
import MonthView from './MonthView.vue'
import EventView from './EventView.vue'
import EventTypesView from './EventTypesView.vue'
import TeamView from './TeamView.vue'
import NewEventModal from './NewEventModal.vue'
import NewEventModalB from './NewEventModalB.vue'
import ReassignModal from './ReassignModal.vue'
import ManageTeamModal from './ManageTeamModal.vue'
import ManageEventTypesModal from './ManageEventTypesModal.vue'
import { applyReassignment } from './useReassignment'

function getMonday(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day))
  d.setHours(0, 0, 0, 0)
  return d
}

const teamMembers = ref<TeamMember[]>([...seedMembers])
const contacts    = ref<Contact[]>([...seedContacts])
const weekStart = ref(getMonday(new Date()))
const visibleMemberIds = ref<string[]>(teamMembers.value.map(m => m.id))
const allTypes = ref<BookingLink[]>([...DEFAULT_BOOKING_LINKS])
const visibleTypes = ref<string[]>(DEFAULT_BOOKING_LINKS.map(l => l.name))
const viewMode    = ref<'week' | 'day' | 'month' | 'event' | 'event-types' | 'team'>('week')
const etView          = ref<'list' | 'form'>('list')
const etCreateTrigger = ref(0)
const etEditId        = ref<string | null>(null)
const etEditTrigger   = ref(0)
const teamViewTab = ref<'members' | 'calendars'>('members')
const events = ref<CalendarEvent[]>(seedEvents)
const modalDate     = ref<string | null>(null)

// ── A/B variant — synced with URL hash (#A or #B) ──────────────────────────
function hashToVariant(): 'A' | 'B' {
  return window.location.hash.toUpperCase().includes('B') ? 'B' : 'A'
}
const abVariant = ref<'A' | 'B'>(hashToVariant())

watch(abVariant, v => {
  history.replaceState(null, '', `/appointments/#${v}`)
})

function onHashChange() {
  abVariant.value = hashToVariant()
}
onMounted(() => {
  // Set hash on first load if not already present
  if (!window.location.hash) history.replaceState(null, '', `/appointments/#A`)
  window.addEventListener('hashchange', onHashChange)
})
onUnmounted(() => window.removeEventListener('hashchange', onHashChange))
const modalInitType = ref<string | null>(null)
const popoverFields = ref<PopoverFields>({ ...DEFAULT_POPOVER_FIELDS })
const startHour = ref(7)
const endHour = ref(20)

const { open: notify } = useNotification()
const reassignModal   = ref<{ fromId?: string; date?: string } | null>(null)
const manageTeamOpen  = ref(false)
const manageTeamTab   = ref<'members' | 'calendars'>('members')
const manageTypesOpen = ref(false)

function openReassignFromDay(date: string) {
  reassignModal.value = { date }
}

function openReassignFromMember(fromId: string) {
  reassignModal.value = { fromId }
}

function openReassignFromEvent(ev: CalendarEvent) {
  reassignModal.value = { fromId: ev.memberIds[0], date: ev.date }
}

function handleReassignConfirm(params: {
  fromId: string
  toId: string
  affected: CalendarEvent[]
  conflictIds: Set<string>
  skipConflicts: boolean
}) {
  const result = applyReassignment(
    events,
    params.fromId,
    params.toId,
    params.affected,
    params.conflictIds,
    params.skipConflicts,
  )
  const toMember = teamMembers.value.find(m => m.id === params.toId)
  reassignModal.value = null
  const n = result.reassigned
  notify({
    title: `${n} appointment${n !== 1 ? 's' : ''} reassigned`,
    description: `Moved to ${toMember?.name ?? 'new staff member'}${result.skipped ? `. ${result.skipped} conflict${result.skipped !== 1 ? 's' : ''} skipped.` : '.'}`,
    variant: 'success',
    duration: 8000,
  })
}

const filteredEvents = computed(() =>
  events.value.filter(e =>
    visibleTypes.value.includes(e.type) &&
    (e.memberIds.length === 0 || e.memberIds.some(id => visibleMemberIds.value.includes(id)))
  )
)

function navigateWeek(delta: number) {
  const d = new Date(weekStart.value)
  if (viewMode.value === 'month') {
    d.setMonth(d.getMonth() + delta)
  } else if (viewMode.value === 'day') {
    d.setDate(d.getDate() + delta)
  } else {
    d.setDate(d.getDate() + delta * 7)
  }
  weekStart.value = d
}

function toggleMember(id: string) {
  if (id === '__all__') { visibleMemberIds.value = teamMembers.value.map(m => m.id); return }
  if (id === '__none__') { visibleMemberIds.value = []; return }
  const i = visibleMemberIds.value.indexOf(id)
  i === -1 ? visibleMemberIds.value.push(id) : visibleMemberIds.value.splice(i, 1)
}

function openNewAppointment(typeName?: string) {
  modalInitType.value = typeName ?? null
  modalDate.value = new Date().toISOString().slice(0, 10)
}

function saveEvent(event: CalendarEvent) {
  events.value.push(event)
  modalDate.value = null
  modalInitType.value = null
}

function addMember(member: TeamMember) {
  teamMembers.value.push(member)
  visibleMemberIds.value.push(member.id)
}

function removeMember(id: string) {
  teamMembers.value = teamMembers.value.filter(m => m.id !== id)
  visibleMemberIds.value = visibleMemberIds.value.filter(mid => mid !== id)
}

function changeMemberColor(id: string, color: string, bg: string) {
  const m = teamMembers.value.find(m => m.id === id)
  if (m) { m.color = color; m.bg = bg }
}

function editMember(id: string, changes: Partial<Pick<{ name: string; role: string; color: string; bg: string; linkedCalendar: string }, 'name' | 'role' | 'color' | 'bg' | 'linkedCalendar'>>) {
  const m = teamMembers.value.find(m => m.id === id)
  if (!m) return
  if (changes.name           !== undefined) m.name           = changes.name
  if (changes.role           !== undefined) m.role           = changes.role
  if (changes.color          !== undefined) m.color          = changes.color
  if (changes.bg             !== undefined) m.bg             = changes.bg
  if (changes.linkedCalendar !== undefined) m.linkedCalendar = changes.linkedCalendar
}

function addType(link: BookingLink) {
  if (!allTypes.value.some(l => l.id === link.id)) allTypes.value.push(link)
  if (!visibleTypes.value.includes(link.name)) visibleTypes.value.push(link.name)
}

function removeType(id: string) {
  const link = allTypes.value.find(l => l.id === id)
  if (!link) return
  allTypes.value    = allTypes.value.filter(l => l.id !== id)
  visibleTypes.value = visibleTypes.value.filter(n => n !== link.name)
}

watch(viewMode, (v) => { if (v !== 'event-types') etView.value = 'list' })

function updateType(id: string, changes: Partial<Omit<BookingLink, 'id'>>) {
  const link = allTypes.value.find(l => l.id === id)
  if (!link) return
  if (changes.name !== undefined && changes.name !== link.name) {
    const oldName = link.name
    const vi = visibleTypes.value.indexOf(oldName)
    if (vi !== -1) visibleTypes.value.splice(vi, 1, changes.name)
    events.value.forEach(e => { if (e.type === oldName) e.type = changes.name! })
  }
  Object.assign(link, changes)
}
</script>

<template>
  <div class="h-full flex flex-col bg-white overflow-hidden">
    <!-- Version A: original top bar -->
    <TopBar
      v-if="abVariant === 'A'"
      :week-start="weekStart"
      :view-mode="viewMode"
      :popover-fields="popoverFields"
      :start-hour="startHour"
      :end-hour="endHour"
      @navigate="navigateWeek"
      @go-today="weekStart = getMonday(new Date())"
      @add-appointment="openNewAppointment()"
      @update:view-mode="viewMode = $event"
      @update:popover-fields="popoverFields = $event"
      @update:start-hour="startHour = $event"
      @update:end-hour="endHour = $event"
      :et-form-open="etView === 'form'"
      @reassign="reassignModal = {}"
      @connect-calendars="teamViewTab = 'calendars'; viewMode = 'team'"
      @back-to-et-list="etView = 'list'"
      @new-event-type="viewMode = 'event-types'; etCreateTrigger++"
    />
    <!-- Version B: "Appointments" header + cal sub-header -->
    <TopBarB
      v-else
      :week-start="weekStart"
      :view-mode="viewMode"
      :booking-links="allTypes"
      :popover-fields="popoverFields"
      :start-hour="startHour"
      :end-hour="endHour"
      @navigate="navigateWeek"
      @go-today="weekStart = getMonday(new Date())"
      @add-appointment="openNewAppointment()"
      @update:view-mode="viewMode = $event"
      @update:popover-fields="popoverFields = $event"
      @update:start-hour="startHour = $event"
      @update:end-hour="endHour = $event"
      @new-event-type="viewMode = 'event-types'; etCreateTrigger++"
      @reassign="reassignModal = {}"
      @connect-calendars="teamViewTab = 'calendars'; viewMode = 'team'"
      @manage-team="manageTeamTab = 'members'; manageTeamOpen = true"
      @back-to-et-list="etView = 'list'"
    />

    <div class="flex flex-1 overflow-hidden">
      <component
        :is="abVariant === 'B' ? SidebarB : Sidebar"
        v-if="viewMode !== 'event-types' && viewMode !== 'team'"
        :week-start="weekStart"
        :team-members="teamMembers"
        :visible-member-ids="visibleMemberIds"
        :visible-types="visibleTypes"
        :all-types="allTypes"
        @go-to-date="weekStart = getMonday($event)"
        @toggle-member="toggleMember"
        @add-member="addMember"
        @remove-member="removeMember"
        @toggle-type="(name: string) => { const i = visibleTypes.indexOf(name); i === -1 ? visibleTypes.push(name) : visibleTypes.splice(i, 1) }"
        @add-type="addType"
        @remove-type="removeType"
        @update:visible-types="visibleTypes = $event"
        @reassign-member="openReassignFromMember"
        @change-member-color="changeMemberColor"
        @manage-team="teamViewTab = 'members'; viewMode = 'team'"
        @manage-types="viewMode = 'event-types'"
        @edit-type="(id: string) => { etEditId = id; etEditTrigger++; viewMode = 'event-types' }"
        @new-appointment="openNewAppointment"
      />
      <!-- Calendar column (with sub-header for Version B) -->
      <div class="flex flex-col flex-1 overflow-hidden">
        <!-- Version B calendar sub-header -->
        <div v-if="abVariant === 'B' && viewMode !== 'event-types' && viewMode !== 'team'" class="cal-sub-header">
          <DexInline align-y="center" gap="100">
            <DexButton variant="transparent" leading-icon="calendar" @click="weekStart = getMonday(new Date())" :style="{ color: 'var(--dex-fgColor-primary)' }">
              {{ weekStart.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) }}
            </DexButton>
            <DexInline gap="000">
              <DexIconButton name="chevron-left"  label="Previous" @click="navigateWeek(-1)" />
              <DexIconButton name="chevron-right" label="Next"     @click="navigateWeek(1)" />
            </DexInline>
          </DexInline>
          <DexInline gap="050" align-y="center">
            <!-- View switcher -->
            <DexDropdownMenu align="end">
              <template #default>
                <DexButton variant="transparent" trailing-icon="chevron-down">
                  {{ { week: 'Week', day: 'Day', month: 'Month', event: 'Event', 'event-types': 'Event types', team: 'Team' }[viewMode] ?? 'Week' }}
                </DexButton>
              </template>
              <template #content>
                <DexDropdownMenuItem @select="viewMode = 'week'">
                  <DexInline align-y="center" align-x="spread" stretch gap="200">
                    <span>Week</span>
                    <svg v-if="viewMode === 'week'" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" style="width:14px;height:14px;color:var(--dex-fgColor-accent-blue);flex-shrink:0"><path fill-rule="evenodd" d="M20.707 6.293a1 1 0 0 1 0 1.414l-11 11a1 1 0 0 1-1.414 0l-5-5a1 1 0 1 1 1.414-1.414L9 16.586 19.293 6.293a1 1 0 0 1 1.414 0" clip-rule="evenodd"/></svg>
                  </DexInline>
                </DexDropdownMenuItem>
                <DexDropdownMenuItem @select="viewMode = 'day'">
                  <DexInline align-y="center" align-x="spread" stretch gap="200">
                    <span>Day</span>
                    <svg v-if="viewMode === 'day'" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" style="width:14px;height:14px;color:var(--dex-fgColor-accent-blue);flex-shrink:0"><path fill-rule="evenodd" d="M20.707 6.293a1 1 0 0 1 0 1.414l-11 11a1 1 0 0 1-1.414 0l-5-5a1 1 0 1 1 1.414-1.414L9 16.586 19.293 6.293a1 1 0 0 1 1.414 0" clip-rule="evenodd"/></svg>
                  </DexInline>
                </DexDropdownMenuItem>
                <DexDropdownMenuItem @select="viewMode = 'month'">
                  <DexInline align-y="center" align-x="spread" stretch gap="200">
                    <span>Month</span>
                    <svg v-if="viewMode === 'month'" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" style="width:14px;height:14px;color:var(--dex-fgColor-accent-blue);flex-shrink:0"><path fill-rule="evenodd" d="M20.707 6.293a1 1 0 0 1 0 1.414l-11 11a1 1 0 0 1-1.414 0l-5-5a1 1 0 1 1 1.414-1.414L9 16.586 19.293 6.293a1 1 0 0 1 1.414 0" clip-rule="evenodd"/></svg>
                  </DexInline>
                </DexDropdownMenuItem>
                <DexDropdownMenuItem @select="viewMode = 'event'">
                  <DexInline align-y="center" align-x="spread" stretch gap="200">
                    <span>Event</span>
                    <svg v-if="viewMode === 'event'" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" style="width:14px;height:14px;color:var(--dex-fgColor-accent-blue);flex-shrink:0"><path fill-rule="evenodd" d="M20.707 6.293a1 1 0 0 1 0 1.414l-11 11a1 1 0 0 1-1.414 0l-5-5a1 1 0 1 1 1.414-1.414L9 16.586 19.293 6.293a1 1 0 0 1 1.414 0" clip-rule="evenodd"/></svg>
                  </DexInline>
                </DexDropdownMenuItem>
              </template>
            </DexDropdownMenu>

            <!-- Filter by team member -->
            <DexDropdownMenu align="end">
              <template #default>
                <DexButton
                  variant="transparent"
                  leading-icon="filter"
                  :style="visibleMemberIds.length < teamMembers.length ? { color: 'var(--dex-fgColor-accent-blue)' } : {}"
                >Filter</DexButton>
              </template>
            <template #content>
              <DexDropdownMenuItem
                v-for="m in teamMembers"
                :key="m.id"
                @select="toggleMember(m.id)"
              >
                <template #leading>
                  <div :style="{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: m.color, flexShrink: '0' }" />
                </template>
                <DexInline align-y="center" align-x="spread" stretch gap="200">
                  <span>{{ m.name }}</span>
                  <svg v-if="visibleMemberIds.includes(m.id)" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" style="width:14px;height:14px;color:var(--dex-fgColor-accent-blue);flex-shrink:0">
                    <path fill-rule="evenodd" d="M20.707 6.293a1 1 0 0 1 0 1.414l-11 11a1 1 0 0 1-1.414 0l-5-5a1 1 0 1 1 1.414-1.414L9 16.586 19.293 6.293a1 1 0 0 1 1.414 0" clip-rule="evenodd"/>
                  </svg>
                </DexInline>
              </DexDropdownMenuItem>
            </template>
            </DexDropdownMenu>
          </DexInline>
        </div>

        <WeekView
          v-if="viewMode === 'week'"
          :week-start="weekStart"
          :events="filteredEvents"
          :team-members="teamMembers"
          :popover-fields="popoverFields"
          :start-hour="startHour"
          :end-hour="endHour"
          @open-new-event="modalDate = $event"
          @reassign-day="openReassignFromDay"
          @reassign-event="openReassignFromEvent"
        />
        <DayView
          v-else-if="viewMode === 'day'"
          :week-start="weekStart"
          :events="filteredEvents"
          :team-members="teamMembers"
          :popover-fields="popoverFields"
          :start-hour="startHour"
          :end-hour="endHour"
          @open-new-event="modalDate = $event"
          @reassign-event="openReassignFromEvent"
        />
        <MonthView
          v-else-if="viewMode === 'month'"
          :week-start="weekStart"
          :events="filteredEvents"
          :team-members="teamMembers"
          :popover-fields="popoverFields"
          @open-new-event="modalDate = $event"
          @reassign-event="openReassignFromEvent"
          @show-week-of="(d) => { weekStart = getMonday(d); viewMode = 'week' }"
        />
        <EventTypesView
          v-else-if="viewMode === 'event-types'"
          :booking-links="allTypes"
          :team-members="teamMembers"
          :view="etView"
          :create-trigger="etCreateTrigger"
          :edit-id="etEditId"
          :edit-trigger="etEditTrigger"
          @update:view="etView = $event"
          @add-type="addType"
          @update-type="updateType"
          @remove-type="removeType"
          @new-appointment="openNewAppointment"
        />
        <TeamView
          v-else-if="viewMode === 'team'"
          :team-members="teamMembers"
          :initial-tab="teamViewTab"
          @add-member="addMember"
          @edit-member="editMember"
          @remove-member="removeMember"
        />
        <EventView
          v-else
          :week-start="weekStart"
          :events="filteredEvents"
          :team-members="teamMembers"
          @open-new-event="modalDate = $event"
        />
      </div><!-- end calendar column -->
    </div>
    <NewEventModal
      v-if="modalDate && abVariant === 'A'"
      :date="modalDate"
      :initial-type="modalInitType ?? undefined"
      :events="events"
      :team-members="teamMembers"
      :booking-links="allTypes"
      :contacts="contacts"
      @close="modalDate = null; modalInitType = null"
      @save="saveEvent"
    />
    <NewEventModalB
      v-else-if="modalDate && abVariant === 'B'"
      :date="modalDate"
      :initial-type="modalInitType ?? undefined"
      :events="events"
      :team-members="teamMembers"
      :booking-links="allTypes"
      :contacts="contacts"
      @close="modalDate = null; modalInitType = null"
      @save="saveEvent"
    />
    <ReassignModal
      v-if="reassignModal !== null"
      :team-members="teamMembers"
      :events="events"
      :default-from-id="reassignModal.fromId"
      :default-date="reassignModal.date"
      @close="reassignModal = null"
      @confirm="handleReassignConfirm"
    />
    <ManageTeamModal
      v-if="manageTeamOpen"
      :team-members="teamMembers"
      :initial-tab="manageTeamTab"
      @close="manageTeamOpen = false"
      @add-member="addMember"
      @edit-member="editMember"
      @remove-member="removeMember"
    />
    <ManageEventTypesModal
      v-if="manageTypesOpen"
      :booking-links="allTypes"
      @close="manageTypesOpen = false"
      @add-type="addType"
      @update-type="updateType"
      @remove-type="removeType"
    />
  </div>
</template>

<style scoped>
.cal-sub-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 12px;
  border-bottom: 1px solid var(--dex-borderColor-alpha-subtle);
  flex-shrink: 0;
  background: var(--dex-surface-flat-bgColor, #fff);
}
</style>

