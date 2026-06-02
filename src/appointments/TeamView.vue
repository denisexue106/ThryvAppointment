<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  DexText,
  DexStack,
  DexInline,
  DexButton,
  DexIconButton,
  DexInput,
  DexConfirmDialog,
  DexConfirmDialogContent,
} from '@thryvlabs/dex-vue'
import type { TeamMember } from './data'

defineOptions({ name: 'TeamView' })

const props = defineProps<{
  teamMembers: TeamMember[]
  initialTab?: 'members' | 'calendars'
}>()

const emit = defineEmits<{
  addMember:    [member: TeamMember]
  editMember:   [id: string, changes: Partial<Pick<TeamMember, 'name' | 'role' | 'color' | 'bg' | 'linkedCalendar'>>]
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

// ── Edit ─────────────────────────────────────────────────────────────
const editingId     = ref<string | null>(null)
const editName      = ref('')
const editRole      = ref('')
const editColor     = ref('')
const editBg        = ref('')
const editLinkedCal = ref('')

function startEdit(m: TeamMember) {
  editingId.value     = m.id
  editName.value      = m.name
  editRole.value      = m.role
  editColor.value     = m.color
  editBg.value        = m.bg
  editLinkedCal.value = m.linkedCalendar ?? ''
}

function saveEdit() {
  if (!editingId.value || !editName.value.trim()) return
  emit('editMember', editingId.value, {
    name:           editName.value.trim(),
    role:           editRole.value.trim() || 'Team member',
    color:          editColor.value,
    bg:             editBg.value,
    linkedCalendar: editLinkedCal.value.trim() || undefined,
  })
  editingId.value = null
}

function cancelEdit() { editingId.value = null }

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

// ── Calendar connect / disconnect ─────────────────────────────────────
const disconnectId = ref<string | null>(null)
const disconnectMember = computed(() => props.teamMembers.find(m => m.id === disconnectId.value) ?? null)

function confirmDisconnect() {
  if (!disconnectId.value) return
  emit('editMember', disconnectId.value, { linkedCalendar: undefined })
  disconnectId.value = null
}

function getInitials(name: string) {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
}
</script>

<template>
  <div class="tv-view">
    <div class="tv-shell">

      <!-- Page header -->
      <div class="tv-page-header">
        <DexStack gap="025">
          <DexText variant="headline-1">Team members</DexText>
          <DexText variant="body-2" color="subtle">
            Add team members and link their calendars.
          </DexText>
        </DexStack>
        <DexButton variant="outline" leading-icon="add" @click="openAdd">
          Add member
        </DexButton>
      </div>

      <!-- ═══════════════════ MEMBERS SECTION ════════════════════ -->
      <div class="tv-section">

        <!-- Add form -->
        <div v-if="showAdd" class="tv-card tv-add-card">
          <DexText variant="body-2" weight="semibold" :style="{ marginBottom: '12px' }">Add team member</DexText>
          <DexStack gap="100">
            <DexInline gap="100" stretch align-y="end">
              <DexInput v-model="addName" label="Name" size="sm" placeholder="Full name" :style="{ flex: 1 }"
                @keydown.enter="submitAdd" @keydown.escape="cancelAdd" />
              <DexInput v-model="addRole" label="Role" size="sm" placeholder="e.g. Technician" :style="{ flex: 1 }"
                @keydown.enter="submitAdd" @keydown.escape="cancelAdd" />
            </DexInline>
            <DexInput v-model="addLinkedCal" label="Linked calendar" size="sm" placeholder="email@example.com"
              @keydown.enter="submitAdd" @keydown.escape="cancelAdd" />
            <DexStack gap="050">
              <DexText variant="caption" color="subtle">Color</DexText>
              <DexInline gap="050">
                <button v-for="c in MEMBER_COLORS" :key="c.color" class="color-swatch" :aria-label="c.label"
                  :style="{ backgroundColor: c.color, outline: addColor.color === c.color ? `2px solid ${c.color}` : '2px solid transparent', outlineOffset: '2px' }"
                  @click="addColor = c" />
              </DexInline>
            </DexStack>
            <DexInline gap="100">
              <DexButton variant="solid" size="sm" :disabled="!addName.trim()" @click="submitAdd">Add member</DexButton>
              <DexButton variant="transparent" size="sm" @click="cancelAdd">Cancel</DexButton>
            </DexInline>
          </DexStack>
        </div>

        <!-- Empty state -->
        <div v-if="teamMembers.length === 0" class="tv-empty">
          <div class="tv-empty-icon">👥</div>
          <DexText variant="headline-3">No team members</DexText>
          <DexText variant="body-2" color="subtle">Add your team so you can assign and track appointments.</DexText>
          <DexButton variant="outline" leading-icon="add" @click="openAdd">Add member</DexButton>
        </div>

        <!-- Member cards -->
        <div v-else class="tv-card-list">
          <div v-for="m in teamMembers" :key="m.id" class="tv-card" :style="{ '--member-color': m.color, '--member-bg': m.bg }">

            <!-- View mode -->
            <template v-if="editingId !== m.id">
              <div class="tv-card-accent" :style="{ backgroundColor: m.color }" />
              <div class="tv-card-actions">
                <DexIconButton name="pencil" :label="`Edit ${m.name}`"   size="dense" variant="transparent" @click="startEdit(m)" />
                <DexIconButton name="trash"  :label="`Remove ${m.name}`" size="dense" variant="transparent" @click="deleteId = m.id" />
              </div>
              <div class="tv-card-body">
                <div class="tv-avatar-lg" :style="{ backgroundColor: m.bg, color: m.color }">
                  {{ getInitials(m.name) }}
                </div>
                <DexStack gap="025">
                  <DexText variant="body-2" weight="semibold" :style="{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }">
                    {{ m.name }}
                  </DexText>
                  <div class="tv-role-badge" :style="{ backgroundColor: m.bg, color: m.color }">{{ m.role }}</div>
                </DexStack>
              </div>
              <div class="tv-card-footer">
                <template v-if="m.linkedCalendar">
                  <div class="tv-cal-footer-row">
                    <span class="tv-cal-status connected">
                      <svg aria-hidden="true" width="11" height="11" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/>
                      </svg>
                      Calendar connected
                    </span>
                    <button class="tv-cal-action-btn danger" @click.stop="disconnectId = m.id">Disconnect</button>
                  </div>
                  <span class="tv-cal-email">{{ m.linkedCalendar }}</span>
                </template>
                <template v-else>
                  <div class="tv-cal-footer-row">
                    <span class="tv-cal-status none">
                      <svg aria-hidden="true" width="11" height="11" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                      </svg>
                      No calendar linked
                    </span>
                    <button class="tv-cal-action-btn" @click.stop="startEdit(m)">+ Connect</button>
                  </div>
                </template>
              </div>
            </template>

            <!-- Edit mode -->
            <template v-else>
              <DexStack gap="100" :style="{ padding: '16px' }">
                <DexInline gap="100" stretch align-y="end">
                  <DexInput v-model="editName" label="Name" size="sm" :style="{ flex: 1 }"
                    @keydown.enter="saveEdit" @keydown.escape="cancelEdit" />
                  <DexInput v-model="editRole" label="Role" size="sm" :style="{ flex: 1 }"
                    @keydown.enter="saveEdit" @keydown.escape="cancelEdit" />
                </DexInline>
                <DexInput v-model="editLinkedCal" label="Linked calendar" size="sm" placeholder="email@example.com or calendar URL"
                  @keydown.enter="saveEdit" @keydown.escape="cancelEdit" />
                <DexStack gap="050">
                  <DexText variant="caption" color="subtle">Color</DexText>
                  <DexInline gap="050">
                    <button v-for="c in MEMBER_COLORS" :key="c.color" class="color-swatch" :aria-label="c.label"
                      :style="{ backgroundColor: c.color, outline: editColor === c.color ? `2px solid ${c.color}` : '2px solid transparent', outlineOffset: '2px' }"
                      @click="setEditColor(c)" />
                  </DexInline>
                </DexStack>
                <DexInline gap="100">
                  <DexButton variant="solid" size="sm" :disabled="!editName.trim()" @click="saveEdit">Save changes</DexButton>
                  <DexButton variant="transparent" size="sm" @click="cancelEdit">Cancel</DexButton>
                </DexInline>
              </DexStack>
            </template>

          </div>
        </div>
      </div>

    </div>

    <!-- Remove member confirm -->
    <DexConfirmDialog
      :open="deleteId !== null"
      @update:open="v => !v && (deleteId = null)"
    >
      <DexConfirmDialogContent
        title="Remove team member?"
        :description="`${deleteMember?.name ?? 'This team member'} will be removed. Their appointments stay on the calendar but will appear unassigned.`"
        confirm-text="Remove"
        cancel-text="Keep member"
        variant="danger"
        @confirm="confirmDelete"
        @cancel="deleteId = null"
      />
    </DexConfirmDialog>

    <!-- Disconnect calendar confirm -->
    <DexConfirmDialog
      :open="disconnectId !== null"
      @update:open="v => !v && (disconnectId = null)"
    >
      <DexConfirmDialogContent
        title="Disconnect calendar?"
        :description="`Disconnect ${disconnectMember?.name ?? 'this member'}'s calendar? Events will no longer sync.`"
        confirm-text="Disconnect"
        cancel-text="Keep connected"
        variant="danger"
        @confirm="confirmDisconnect"
        @cancel="disconnectId = null"
      />
    </DexConfirmDialog>
  </div>
</template>

<style scoped>
/* ── Shell ───────────────────────────────────────────────────── */
.tv-view {
  flex: 1;
  overflow-y: auto;
  background-color: var(--dex-bgColor-alpha-subtle);
  display: flex;
  flex-direction: column;
}

.tv-shell {
  width: 100%;
  padding: 32px 32px 48px;
  display: flex;
  flex-direction: column;
  gap: 0;
}

.tv-page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 24px;
}

/* ── Section ─────────────────────────────────────────────────── */
.tv-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 40px;
}
.tv-section:last-child { margin-bottom: 0; }

.tv-section-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

/* ── Empty state ─────────────────────────────────────────────── */
.tv-empty {
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
.tv-empty-icon { font-size: 40px; line-height: 1; }

.tv-empty-sm {
  padding: 24px;
  justify-content: flex-start;
  flex-direction: row;
  text-align: left;
}

/* ── Cards ───────────────────────────────────────────────────── */
.tv-card-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 16px;
  align-items: start;
}

.tv-card {
  position: relative;
  background: var(--dex-surface-flat-bgColor);
  border: 1px solid var(--dex-borderColor-default);
  border-radius: var(--dex-borderRadius-100);
  overflow: hidden;
  padding: 0;
  transition: box-shadow 0.15s ease, border-color 0.15s ease;
}
.tv-card:hover {
  border-color: var(--member-color, var(--dex-borderColor-emphasis));
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
}

.tv-add-card {
  border-style: dashed;
  border-color: var(--dex-borderColor-emphasis);
  padding: 16px;
}

/* ── Card sections ───────────────────────────────────────────── */
.tv-card-accent {
  height: 4px;
  width: 100%;
}

.tv-card-actions {
  position: absolute;
  top: 12px;
  right: 10px;
  display: flex;
  gap: 2px;
  opacity: 0;
  transition: opacity 0.15s;
}
.tv-card:hover .tv-card-actions { opacity: 1; }

.tv-card-body {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 16px 12px;
}

.tv-card-footer {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 0 16px 14px;
  border-top: 1px solid var(--dex-borderColor-alpha-subtle);
  padding-top: 10px;
  margin-top: 2px;
}

/* ── Avatar ──────────────────────────────────────────────────── */
.tv-avatar-lg {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: 700;
  flex-shrink: 0;
}

/* ── Role badge ──────────────────────────────────────────────── */
.tv-role-badge {
  display: inline-block;
  font-size: 11px;
  font-weight: 500;
  padding: 2px 8px;
  border-radius: 100px;
  width: fit-content;
}

/* ── Calendar status ─────────────────────────────────────────── */
.tv-cal-status {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  font-weight: 500;
}
.tv-cal-status.connected { color: #1e8e3e; }
.tv-cal-status.none { color: var(--dex-fgColor-subtle); font-weight: 400; }
.tv-cal-status svg { flex-shrink: 0; }

.tv-cal-footer-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.tv-cal-action-btn {
  font-size: 11px;
  font-weight: 500;
  color: var(--dex-fgColor-link);
  background: none;
  border: none;
  cursor: pointer;
  padding: 2px 0;
  border-radius: 2px;
  white-space: nowrap;
  flex-shrink: 0;
  opacity: 0;
  transition: opacity 0.15s;
}
.tv-card:hover .tv-cal-action-btn { opacity: 1; }
.tv-cal-action-btn.danger { color: var(--dex-fgColor-danger); }
.tv-cal-action-btn:hover { text-decoration: underline; }

.tv-cal-email {
  font-size: 11px;
  color: var(--dex-fgColor-subtle);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ── Swatches ────────────────────────────────────────────────── */
.color-swatch {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: none;
  cursor: pointer;
  transition: transform 0.1s ease;
}
.color-swatch:hover { transform: scale(1.15); }
</style>
