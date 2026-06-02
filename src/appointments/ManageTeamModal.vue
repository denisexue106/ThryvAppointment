<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  DexModal,
  DexModalContent,
  DexModalHeading,
  DexModalBody,
  DexModalFooter,
  DexButton,
  DexIconButton,
  DexInput,
  DexStack,
  DexInline,
  DexText,
  DexDivider,
  DexConfirmDialog,
  DexConfirmDialogContent,
  DexStatus,
  DexIcon,
  DexTag,
  DexDropdownMenu,
  DexDropdownMenuItem,
  DexCard,
} from '@thryvlabs/dex-vue'
import type { TeamMember } from './data'

defineOptions({ name: 'ManageTeamModal' })

const props = defineProps<{
  teamMembers: TeamMember[]
  initialTab?: 'members' | 'calendars'
}>()

const emit = defineEmits<{
  close: []
  addMember: [member: TeamMember]
  editMember: [id: string, changes: Partial<Pick<TeamMember, 'name' | 'role' | 'color' | 'bg' | 'linkedCalendar'>>]
  removeMember: [id: string]
}>()


// ── Colors ────────────────────────────────────────────────────────────
const MEMBER_COLORS: { color: string; bg: string; label: string }[] = [
  { color: '#1a73e8', bg: '#e8f0fe', label: 'Blue' },
  { color: '#1e8e3e', bg: '#e6f4ea', label: 'Green' },
  { color: '#7c3aed', bg: '#ede9fe', label: 'Purple' },
  { color: '#d93025', bg: '#fce8e6', label: 'Red' },
  { color: '#00897b', bg: '#e0f2f1', label: 'Teal' },
  { color: '#f59e0b', bg: '#fef3c7', label: 'Amber' },
  { color: '#ec4899', bg: '#fce7f3', label: 'Pink' },
  { color: '#6366f1', bg: '#e0e7ff', label: 'Indigo' },
]

// ── Expand ────────────────────────────────────────────────────────────
const expandedId = ref<string | null>(null)

function toggleExpand(id: string) {
  if (expandedId.value === id) {
    expandedId.value = null
    editingId.value = null
  } else {
    expandedId.value = id
    const m = props.teamMembers.find(m => m.id === id)
    if (m) startEdit(m)
  }
}

// ── Edit ─────────────────────────────────────────────────────────────
const editingId     = ref<string | null>(null)
const editName      = ref('')
const editRole      = ref('')
const editColor     = ref('')
const editBg        = ref('')
const editLinkedCal = ref('')

// ── Edit mode — multi-calendar management ─────────────────────────────
interface EditCalendar {
  email: string
  status: 'connected' | 'pending'
}
const editCalendars   = ref<EditCalendar[]>([])
const showInviteInput = ref(false)
const inviteEmail     = ref('')
const sendingInvite   = ref(false)

function startEdit(m: TeamMember) {
  editingId.value       = m.id
  editName.value        = m.name
  editRole.value        = m.role
  editColor.value       = m.color
  editBg.value          = m.bg
  editLinkedCal.value   = m.linkedCalendar ?? ''
  editCalendars.value   = m.linkedCalendar
    ? [{ email: m.linkedCalendar, status: 'connected' as const }]
    : []
  showInviteInput.value = false
  inviteEmail.value     = ''
}

function saveEdit() {
  if (!editingId.value || !editName.value.trim()) return
  const firstConnected = editCalendars.value.find(c => c.status === 'connected')
  const calEmail = firstConnected?.email ?? editCalendars.value[0]?.email ?? ''
  emit('editMember', editingId.value, {
    name:           editName.value.trim(),
    role:           editRole.value.trim() || 'Team member',
    color:          editColor.value,
    bg:             editBg.value,
    linkedCalendar: calEmail || undefined,
  })
  editingId.value  = null
  expandedId.value = null
}

function cancelEdit() {
  editingId.value  = null
  expandedId.value = null
}

async function sendCalendarInvite() {
  if (!inviteEmail.value.trim()) return
  sendingInvite.value = true
  await new Promise(r => setTimeout(r, 900))
  editCalendars.value.push({ email: inviteEmail.value.trim(), status: 'pending' })
  inviteEmail.value     = ''
  showInviteInput.value = false
  sendingInvite.value   = false
}

function setEditColor(c: { color: string; bg: string }) {
  editColor.value = c.color
  editBg.value    = c.bg
}

// ── Delete ────────────────────────────────────────────────────────────
const deleteId     = ref<string | null>(null)
const deleteMember = computed(() => props.teamMembers.find(m => m.id === deleteId.value) ?? null)

function confirmDelete() {
  if (!deleteId.value) return
  emit('removeMember', deleteId.value)
  if (editingId.value === deleteId.value) editingId.value = null
  deleteId.value = null
}

// ── Add ───────────────────────────────────────────────────────────────
const showAdd      = ref(false)
const addName      = ref('')
const addRole      = ref('')
const addLinkedCal = ref('')
const addColor     = ref(MEMBER_COLORS[0])

function openAdd() {
  addColor.value     = MEMBER_COLORS[props.teamMembers.length % MEMBER_COLORS.length]
  addName.value      = ''
  addRole.value      = ''
  addLinkedCal.value = ''
  showAdd.value      = true
}

function submitAdd() {
  if (!addName.value.trim()) return
  emit('addMember', {
    id:             `m${Date.now()}`,
    name:           addName.value.trim(),
    role:           addRole.value.trim() || 'Team member',
    color:          addColor.value.color,
    bg:             addColor.value.bg,
    linkedCalendar: addLinkedCal.value.trim() || undefined,
  })
  showAdd.value = false
}

function cancelAdd() {
  showAdd.value      = false
  addName.value      = ''
  addRole.value      = ''
  addLinkedCal.value = ''
}

// ── Calendars tab ─────────────────────────────────────────────────────
type SyncStatus = 'active' | 'syncing' | 'error'

interface SyncedCalendar {
  id: string
  memberId: string
  email: string
  status: SyncStatus
}

const calendars = ref<SyncedCalendar[]>(
  props.teamMembers
    .filter(m => m.linkedCalendar)
    .map(m => ({
      id:       `cal-${m.id}`,
      memberId: m.id,
      email:    m.linkedCalendar!,
      status:   'active' as SyncStatus,
    }))
)

const disconnectId  = ref<string | null>(null)
const connecting    = ref(false)
const connectError  = ref<string | null>(null)
const connectEmail  = ref('')
const showConnectForm = ref(false)

function statusVariant(s: SyncStatus): 'success' | 'warning' | 'danger' {
  if (s === 'active')  return 'success'
  if (s === 'syncing') return 'warning'
  return 'danger'
}

function statusLabel(s: SyncStatus): string {
  if (s === 'active')  return 'Connected'
  if (s === 'syncing') return 'Syncing…'
  return 'Error'
}

function confirmDisconnect() {
  if (!disconnectId.value) return
  calendars.value = calendars.value.filter(c => c.id !== disconnectId.value)
  disconnectId.value = null
}

async function submitConnect() {
  if (!connectEmail.value.trim()) return
  connecting.value = true
  connectError.value = null
  try {
    await new Promise(r => setTimeout(r, 1200))
    const match = props.teamMembers.find(m =>
      m.email === connectEmail.value.trim() || m.linkedCalendar === connectEmail.value.trim()
    )
    const newCal: SyncedCalendar = {
      id:       `cal-${Date.now()}`,
      memberId: match?.id ?? '',
      email:    connectEmail.value.trim(),
      status:   'syncing',
    }
    calendars.value.push(newCal)
    setTimeout(() => { newCal.status = 'active' }, 2000)
    connectEmail.value  = ''
    showConnectForm.value = false
  } catch {
    connectError.value = 'Could not connect calendar. Please try again.'
  } finally {
    connecting.value = false
  }
}

function calMember(memberId: string) {
  return props.teamMembers.find(m => m.id === memberId)
}
</script>

<template>
  <DexModal :open="true" @update:open="v => { if (!v) emit('close') }">
    <DexModalContent>
      <DexModalHeading title="Team members" />

      <DexModalBody>
        <DexStack gap="100">

          <!-- Member cards -->
          <DexCard
            v-for="m in teamMembers"
            :key="m.id"
            elevation="subtle"
            class="member-card"
          >
            <!-- ── Card header ─────────────────────────────────────────────── -->
            <div class="mc-header" @click="toggleExpand(m.id)">
              <span class="color-dot" :style="{ backgroundColor: m.color }" />
              <DexStack gap="000" :style="{ flex: 1, minWidth: 0 }">
                <DexText variant="body-2" weight="semibold"
                  :style="{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }">
                  {{ m.name }}
                </DexText>
                <DexText variant="caption" color="subtle">{{ m.role }}</DexText>
                <DexInline align-y="center" gap="075" :style="{ marginTop: '2px' }">
                  <DexIcon name="calendar" size="xs" :style="{ color: 'var(--dex-fgColor-subtle)' }" />
                  <DexText v-if="m.linkedCalendar" variant="x-small" color="subtle"
                    :style="{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '160px' }">
                    {{ m.linkedCalendar }}
                  </DexText>
                  <DexStatus v-if="m.linkedCalendar" variant="success" :leading-icon="true">Connected</DexStatus>
                  <DexText v-else variant="x-small" color="subtle">No calendar linked</DexText>
                </DexInline>
              </DexStack>
              <DexInline gap="075" align-y="center" @click.stop>
                <DexTag v-if="m.isUser" color="blue" emphasis="low">User</DexTag>
                <DexIconButton name="trash" :label="`Remove ${m.name}`" size="dense" variant="transparent" @click="deleteId = m.id" />
              </DexInline>
              <DexIconButton
                :name="expandedId === m.id ? 'chevron-up' : 'chevron-down'"
                :label="expandedId === m.id ? 'Collapse' : 'Expand'"
                size="dense"
                variant="transparent"
                @click.stop="toggleExpand(m.id)"
              />
            </div>

            <!-- ── Expanded edit form ──────────────────────────────────────── -->
            <div v-if="expandedId === m.id" class="mc-edit">
              <DexStack gap="150">
                <!-- Name (large) + Role + Color on one line -->
                <DexInline gap="100" stretch align-y="end">
                  <DexInput v-model="editName" label="Name" :style="{ flex: 2 }"
                    @keydown.enter="saveEdit" @keydown.escape="cancelEdit" />
                  <DexInput v-model="editRole" label="Role" :style="{ flex: 1 }"
                    @keydown.enter="saveEdit" @keydown.escape="cancelEdit" />
                  <!-- Color dropdown inline -->
                  <DexDropdownMenu align="start">
                    <template #default>
                      <DexInput
                        label="Color"
                        :model-value="MEMBER_COLORS.find(c => c.color === editColor)?.label ?? ''"
                        trailing-icon="chevron-down"
                        :style="{ minWidth: '120px', cursor: 'pointer' }"
                      >
                        <template #leading>
                          <span class="color-dot" :style="{ backgroundColor: editColor, width: '12px', height: '12px', flexShrink: '0' }" />
                        </template>
                      </DexInput>
                    </template>
                    <template #content>
                      <DexDropdownMenuItem
                        v-for="c in MEMBER_COLORS" :key="c.color"
                        @select="setEditColor(c)"
                      >
                        <template #leading>
                          <span class="color-dot" :style="{ backgroundColor: c.color, width: '12px', height: '12px' }" />
                        </template>
                        <DexInline align-y="center" align-x="spread" stretch gap="200">
                          <span>{{ c.label }}</span>
                          <svg v-if="editColor === c.color" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" style="width:14px;height:14px;flex-shrink:0"><path fill-rule="evenodd" d="M20.707 6.293a1 1 0 0 1 0 1.414l-11 11a1 1 0 0 1-1.414 0l-5-5a1 1 0 1 1 1.414-1.414L9 16.586 19.293 6.293a1 1 0 0 1 1.414 0" clip-rule="evenodd"/></svg>
                        </DexInline>
                      </DexDropdownMenuItem>
                    </template>
                  </DexDropdownMenu>
                </DexInline>

                <!-- Calendars section -->
                <DexStack gap="100">
                  <DexInline align-y="center" align-x="spread" stretch>
                    <DexText variant="body-2" weight="semibold">Calendars</DexText>
                    <DexButton
                      v-if="!showInviteInput"
                      variant="transparent" size="sm" leading-icon="add"
                      @click="showInviteInput = true"
                    >Add calendar</DexButton>
                  </DexInline>

                  <DexStack v-if="editCalendars.length > 0" gap="075">
                    <div v-for="(cal, i) in editCalendars" :key="i" class="cal-row">
                      <DexInline align-y="center" stretch gap="100">
                        <DexIcon name="calendar" size="sm" :style="{ color: 'var(--dex-fgColor-subtle)', flexShrink: '0' }" />
                        <DexText variant="body-2" :style="{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }">
                          {{ cal.email }}
                        </DexText>
                        <DexStatus :variant="cal.status === 'connected' ? 'success' : 'warning'" :leading-icon="true">
                          {{ cal.status === 'connected' ? 'Connected' : 'Invitation sent' }}
                        </DexStatus>
                        <DexIconButton name="x" label="Remove calendar" size="dense" @click="editCalendars.splice(i, 1)" />
                      </DexInline>
                    </div>
                  </DexStack>
                  <DexText v-else-if="!showInviteInput" variant="body-2" color="subtle">No calendars connected</DexText>

                  <div v-if="showInviteInput" class="invite-form">
                    <DexStack gap="100">
                      <DexText variant="caption" color="subtle">
                        An email will be sent asking the team member to grant calendar access.
                      </DexText>
                      <DexInput
                        v-model="inviteEmail"
                        label="Email address"
                        size="sm"
                        placeholder="e.g. name@gmail.com"
                        @keydown.enter="sendCalendarInvite"
                        @keydown.escape="showInviteInput = false; inviteEmail = ''"
                      />
                      <DexInline gap="100">
                        <DexButton variant="solid" size="sm"
                          :disabled="!inviteEmail.trim() || sendingInvite"
                          @click="sendCalendarInvite"
                        >{{ sendingInvite ? 'Sending…' : 'Send invite' }}</DexButton>
                        <DexButton variant="transparent" size="sm"
                          @click="showInviteInput = false; inviteEmail = ''"
                        >Cancel</DexButton>
                      </DexInline>
                    </DexStack>
                  </div>
                </DexStack>

                <!-- Save / Cancel -->
                <DexInline gap="100">
                  <DexButton variant="outline" size="sm" :disabled="!editName.trim()" @click="saveEdit">Save</DexButton>
                  <DexButton variant="transparent" size="sm" @click="cancelEdit">Cancel</DexButton>
                </DexInline>
              </DexStack>
            </div>
          </DexCard>

          <!-- New member card (same layout as edit) -->
          <DexCard v-if="showAdd" elevation="subtle" class="member-card">
            <div class="mc-header">
              <span class="color-dot" :style="{ backgroundColor: addColor.color }" />
              <DexStack gap="000" :style="{ flex: 1, minWidth: 0 }">
                <DexText variant="body-2" weight="semibold" color="subtle">New team member</DexText>
              </DexStack>
            </div>
            <div class="mc-edit">
              <DexStack gap="150">
                <!-- Name + Role + Color -->
                <DexInline gap="100" stretch align-y="end">
                  <DexInput v-model="addName" label="Name" :style="{ flex: 2 }" placeholder="Full name"
                    @keydown.enter="submitAdd" @keydown.escape="cancelAdd" />
                  <DexInput v-model="addRole" label="Role" :style="{ flex: 1 }" placeholder="e.g. Technician"
                    @keydown.enter="submitAdd" @keydown.escape="cancelAdd" />
                  <DexDropdownMenu align="start">
                    <template #default>
                      <DexInput
                        label="Color"
                        :model-value="addColor.label"
                        trailing-icon="chevron-down"
                        :style="{ minWidth: '120px', cursor: 'pointer' }"
                      >
                        <template #leading>
                          <span class="color-dot" :style="{ backgroundColor: addColor.color, width: '12px', height: '12px', flexShrink: '0' }" />
                        </template>
                      </DexInput>
                    </template>
                    <template #content>
                      <DexDropdownMenuItem
                        v-for="c in MEMBER_COLORS" :key="c.color"
                        @select="addColor = c"
                      >
                        <template #leading>
                          <span class="color-dot" :style="{ backgroundColor: c.color, width: '12px', height: '12px' }" />
                        </template>
                        <DexInline align-y="center" align-x="spread" stretch gap="200">
                          <span>{{ c.label }}</span>
                          <svg v-if="addColor.color === c.color" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" style="width:14px;height:14px;flex-shrink:0"><path fill-rule="evenodd" d="M20.707 6.293a1 1 0 0 1 0 1.414l-11 11a1 1 0 0 1-1.414 0l-5-5a1 1 0 1 1 1.414-1.414L9 16.586 19.293 6.293a1 1 0 0 1 1.414 0" clip-rule="evenodd"/></svg>
                        </DexInline>
                      </DexDropdownMenuItem>
                    </template>
                  </DexDropdownMenu>
                </DexInline>

                <!-- Calendars -->
                <DexStack gap="100">
                  <DexInline align-y="center" align-x="spread" stretch>
                    <DexText variant="body-2" weight="semibold">Calendars</DexText>
                  </DexInline>
                  <DexText variant="body-2" color="subtle">You can connect a calendar after adding the member.</DexText>
                </DexStack>

                <!-- Save / Cancel -->
                <DexInline gap="100">
                  <DexButton variant="outline" size="sm" :disabled="!addName.trim()" @click="submitAdd">Add member</DexButton>
                  <DexButton variant="transparent" size="sm" @click="cancelAdd">Cancel</DexButton>
                </DexInline>
              </DexStack>
            </div>
          </DexCard>

          <DexButton
            v-else
            variant="outline"
            leading-icon="add"
            :style="{ alignSelf: 'flex-start' }"
            @click="openAdd"
          >
            Add member
          </DexButton>

        </DexStack>
      </DexModalBody>

      <DexModalFooter>
        <DexInline align-x="right" stretch>
          <DexButton variant="solid" @click="emit('close')">Done</DexButton>
        </DexInline>
      </DexModalFooter>
    </DexModalContent>
  </DexModal>

  <!-- Remove team member confirmation -->
  <DexConfirmDialog
    :open="deleteId !== null"
    @update:open="v => !v && (deleteId = null)"
  >
    <DexConfirmDialogContent
      title="Remove team member?"
      :description="`${deleteMember?.name ?? 'This team member'} will be removed from your calendar. Their appointments will remain but appear unassigned.`"
      confirm-text="Remove"
      cancel-text="Keep member"
      variant="danger"
      @confirm="confirmDelete"
      @cancel="deleteId = null"
    />
  </DexConfirmDialog>

  <!-- Disconnect calendar confirmation -->
  <DexConfirmDialog
    :open="disconnectId !== null"
    @update:open="v => !v && (disconnectId = null)"
  >
    <DexConfirmDialogContent
      title="Disconnect calendar?"
      description="Events will no longer sync between Thryv and this calendar."
      confirm-text="Disconnect"
      cancel-text="Keep connected"
      variant="danger"
      @confirm="confirmDisconnect"
      @cancel="disconnectId = null"
    />
  </DexConfirmDialog>
</template>

<style scoped>
.member-card {
  overflow: hidden;
}

.mc-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  cursor: pointer;
  user-select: none;
  transition: background 0.12s;
}

.mc-header:hover {
  background: var(--dex-bgColor-transparent-hover);
}

.mc-edit {
  padding: 0 12px 14px;
  border-top: 1px solid var(--dex-borderColor-alpha-subtle);
  padding-top: 14px;
}

.add-form {
  padding: var(--dex-spacing-100) var(--dex-spacing-100);
  border-radius: var(--dex-borderRadius-075);
  border: 1px solid var(--dex-borderColor-default);
  background-color: var(--dex-surface-flat-bgColor);
}

.color-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.color-swatch {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: none;
  cursor: pointer;
  transition: transform 0.1s ease;
}

.color-swatch:hover {
  transform: scale(1.15);
}

.linked-cal-icon {
  width: 11px;
  height: 11px;
  flex-shrink: 0;
  color: var(--dex-fgColor-subtle);
}

.cal-row {
  padding: 6px 8px;
  border-radius: var(--dex-borderRadius-050);
  background: var(--dex-bgColor-alpha-subtle);
  border: 1px solid var(--dex-borderColor-alpha-subtle);
}

.invite-form {
  padding: var(--dex-spacing-100);
  border-radius: var(--dex-borderRadius-075);
  border: 1px solid var(--dex-borderColor-default);
  background-color: var(--dex-surface-flat-bgColor);
}

/* Color selector — uses dex-input class, just needs gap + cursor */
.color-input-trigger {
  cursor: pointer;
  gap: 8px;
  min-width: 100px;
}
.color-input-chevron {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  color: var(--dex-fgColor-subtle);
}
</style>
