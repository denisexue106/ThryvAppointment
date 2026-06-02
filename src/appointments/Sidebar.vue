<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  DexText,
  DexIconButton,
  DexBox,
  DexStack,
  DexInline,
  DexInput,
  DexButton,
  DexButtonGroup,
  DexCheckbox,
  DexList,
  DexListItem,
  DexListHeading,
  DexDropdownMenu,
  DexDropdownMenuItem,
  DexDropdownMenuSeparator,
  DexDropdownMenuSubItem,
  DexModal,
  DexModalContent,
  DexModalHeading,
  DexModalBody,
  DexModalFooter,
} from '@thryvlabs/dex-vue'
import type { TeamMember, BookingLink } from './data'

defineOptions({ name: 'CalendarSidebar' })

const props = defineProps<{
  weekStart: Date
  teamMembers: TeamMember[]
  visibleMemberIds: string[]
  visibleTypes: string[]
  allTypes: BookingLink[]
}>()

const emit = defineEmits<{
  goToDate: [date: Date]
  toggleMember: [id: string]
  addMember: [member: TeamMember]
  removeMember: [id: string]
  toggleType: [name: string]
  addType: [link: BookingLink]
  removeType: [id: string]
  'update:visibleTypes': [names: string[]]
  reassignMember: [id: string]
  changeMemberColor: [id: string, color: string, bg: string]
  manageTeam: []
  manageTypes: []
  editType: [id: string]
  'new-appointment': [typeName: string]
}>()

const deleteConfirmId = ref<string | null>(null)

const deleteConfirmMember = computed(() =>
  props.teamMembers.find(m => m.id === deleteConfirmId.value) ?? null
)

function bookingUrl(link: BookingLink) {
  const slug = link.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
  return `summithvac.com/book/${slug}`
}

function confirmDelete() {
  if (deleteConfirmId.value) {
    emit('removeMember', deleteConfirmId.value)
    deleteConfirmId.value = null
  }
}

const teamExpanded = ref(true)
const typesExpanded = ref(true)
const groupByRole = ref(false)

const groupedMembers = computed(() => {
  const groups: Record<string, TeamMember[]> = {}
  for (const m of props.teamMembers) {
    const role = m.role || 'Other'
    if (!groups[role]) groups[role] = []
    groups[role].push(m)
  }
  return Object.entries(groups).map(([role, members]) => ({ role, members }))
})

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

function nextColor() {
  const used = props.teamMembers.length
  return MEMBER_COLORS[used % MEMBER_COLORS.length]
}

const miniDate = ref(new Date())

const year = computed(() => miniDate.value.getFullYear())
const month = computed(() => miniDate.value.getMonth())

const monthLabel = computed(() =>
  miniDate.value.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
)

function prevMonth() {
  const d = new Date(miniDate.value)
  d.setMonth(d.getMonth() - 1)
  miniDate.value = d
}
function nextMonth() {
  const d = new Date(miniDate.value)
  d.setMonth(d.getMonth() + 1)
  miniDate.value = d
}

const calDays = computed<Date[]>(() => {
  const first = new Date(year.value, month.value, 1)
  const last = new Date(year.value, month.value + 1, 0)
  const startOffset = (first.getDay() + 6) % 7
  const days: Date[] = []
  for (let d = startOffset; d > 0; d--) {
    days.push(new Date(year.value, month.value, 1 - d))
  }
  for (let d = 1; d <= last.getDate(); d++) {
    days.push(new Date(year.value, month.value, d))
  }
  let next = 1
  while (days.length % 7 !== 0) {
    days.push(new Date(year.value, month.value + 1, next++))
  }
  return days
})

const todayMidnight = (() => {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
})()

function isToday(d: Date) {
  return d.toDateString() === todayMidnight.toDateString()
}

function isInWeek(d: Date) {
  const end = new Date(props.weekStart)
  end.setDate(end.getDate() + 6)
  return d >= props.weekStart && d <= end
}
</script>

<template>
  <aside
    class="flex-shrink-0 flex flex-col overflow-y-auto"
    style="width: 375px;"
    :style="{
      borderRight: '1px solid var(--dex-borderColor-alpha-subtle)',
      backgroundColor: 'var(--dex-bgColor-alpha-subtle)',
    }"
  >
    <!-- Mini calendar -->
    <DexBox
      padding="150"
      :style="{ borderBottom: '1px solid var(--dex-borderColor-alpha-subtle)' }"
    >
      <DexStack gap="100">
        <!-- Month nav -->
        <DexInline align-y="center" align-x="spread" stretch>
          <DexText variant="body-2" weight="semibold">{{ monthLabel }}</DexText>
          <DexInline gap="000">
            <DexIconButton name="chevron-left" label="Previous month" size="dense" @click="prevMonth" />
            <DexIconButton name="chevron-right" label="Next month" size="dense" @click="nextMonth" />
          </DexInline>
        </DexInline>

        <!-- Day-of-week headers -->
        <div class="grid grid-cols-7">
          <div
            v-for="label in ['M','T','W','T','F','S','S']"
            :key="label"
            class="text-center py-0.5"
          >
            <DexText variant="x-small" color="subtle">{{ label }}</DexText>
          </div>
        </div>

        <!-- Day cells -->
        <div class="grid grid-cols-7 gap-y-0.5">
          <button
            v-for="(date, i) in calDays"
            :key="i"
            @click="emit('goToDate', date)"
            :class="[
              'aspect-square flex items-center justify-center rounded-full transition-colors text-xs cursor-pointer',
              isToday(date) ? 'bg-blue-600 text-white font-bold' : isInWeek(date) ? 'font-medium' : '',
            ]"
            :style="isToday(date)
              ? {}
              : isInWeek(date)
              ? { backgroundColor: 'var(--dex-bgColor-accent-blue-subtle)', color: 'var(--dex-color-accent-blue-emphasis)' }
              : date.getMonth() !== month.value
              ? { color: 'var(--dex-fgColor-subtle)' }
              : { color: 'var(--dex-page-fgColor)' }"
          >
            <DexText
              variant="caption"
              :weight="isToday(date) || isInWeek(date) ? 'semibold' : 'regular'"
              :style="{ color: 'inherit' }"
            >{{ date.getDate() }}</DexText>
          </button>
        </div>
      </DexStack>
    </DexBox>

    <!-- Team members -->
    <DexBox padding="150">
      <DexList border="none">
        <DexListHeading>
          <template #title>
            <div class="flex items-center w-full">
              <button
                class="flex-1 text-left hover:opacity-70 transition-opacity"
                @click="teamExpanded = !teamExpanded"
              >
                Team members
              </button>
              <div class="flex items-center gap-0.5 ml-auto">
                <DexDropdownMenu>
                  <template #default>
                    <DexIconButton name="more-horizontal" label="Team options" size="dense" />
                  </template>
                  <template #content>
                    <DexDropdownMenuItem leading-icon="check" title="Select all" @select="$emit('toggleMember', '__all__')" />
                    <DexDropdownMenuItem leading-icon="x" title="Deselect all" @select="$emit('toggleMember', '__none__')" />
                  </template>
                </DexDropdownMenu>
                <button class="hover:opacity-70 transition-opacity p-0.5" @click="teamExpanded = !teamExpanded">
                  <svg
                    class="w-3.5 h-3.5 transition-transform duration-200 flex-shrink-0"
                    :style="{ transform: teamExpanded ? 'rotate(0deg)' : 'rotate(-90deg)' }"
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                  </svg>
                </button>
              </div>
            </div>
          </template>
        </DexListHeading>

        <!-- Manage button -->
        <div v-show="teamExpanded" class="sidebar-manage-row">
          <DexButton variant="transparent" size="sm" @click="emit('manageTeam')">
            Manage team members
          </DexButton>
        </div>

        <!-- Flat list -->
        <template v-if="!groupByRole">
          <DexListItem
            v-for="m in teamMembers"
            v-show="teamExpanded"
            :key="m.id"
            :title="m.name"
            :description="m.role"
            border="none"
          >
            <template #leading>
              <DexCheckbox
                :checked="visibleMemberIds.includes(m.id)"
                @update:checked="emit('toggleMember', m.id)"
                @click.stop
              />
            </template>
            <template #trailing>
              <div class="member-trailing">
                <span class="member-dot" :style="{ backgroundColor: m.color }" />
                <div class="member-actions">
                  <DexDropdownMenu>
                    <template #default>
                      <DexIconButton name="more-horizontal" :label="`Options for ${m.name}`" size="dense" @click.stop />
                    </template>
                    <template #content>
                      <DexDropdownMenuItem leading-icon="refresh-cw" title="Reassign appointments" @select="emit('reassignMember', m.id)" />
                      <DexDropdownMenuSubItem leading-icon="eyedropper" title="Change color">
                        <DexDropdownMenuItem v-for="swatch in MEMBER_COLORS" :key="swatch.color" :title="swatch.label" @select="emit('changeMemberColor', m.id, swatch.color, swatch.bg)">
                          <template #leading><span class="color-dot" :style="{ backgroundColor: swatch.color }" /></template>
                        </DexDropdownMenuItem>
                      </DexDropdownMenuSubItem>
                      <DexDropdownMenuSeparator />
                      <DexDropdownMenuItem leading-icon="trash" title="Delete member" variant="danger" @select="deleteConfirmId = m.id" />
                    </template>
                  </DexDropdownMenu>
                </div>
              </div>
            </template>
          </DexListItem>
        </template>

        <!-- Grouped by role -->
        <template v-else>
          <template v-for="group in groupedMembers" :key="group.role">
            <div v-show="teamExpanded" class="group-role-label">
              <DexText variant="caption" color="subtle" weight="semibold">{{ group.role }}</DexText>
            </div>
            <DexListItem
              v-for="m in group.members"
              v-show="teamExpanded"
              :key="m.id"
              :title="m.name"
              border="none"
            >
              <template #leading>
                <DexCheckbox
                  :checked="visibleMemberIds.includes(m.id)"
                  @update:checked="emit('toggleMember', m.id)"
                  @click.stop
                />
              </template>
              <template #trailing>
                <div class="member-trailing">
                  <span class="member-dot" :style="{ backgroundColor: m.color }" />
                  <div class="member-actions">
                    <DexDropdownMenu>
                      <template #default>
                        <DexIconButton name="more-horizontal" :label="`Options for ${m.name}`" size="dense" @click.stop />
                      </template>
                      <template #content>
                        <DexDropdownMenuItem leading-icon="refresh-cw" title="Reassign appointments" @select="emit('reassignMember', m.id)" />
                        <DexDropdownMenuSubItem leading-icon="eyedropper" title="Change color">
                          <DexDropdownMenuItem v-for="swatch in MEMBER_COLORS" :key="swatch.color" :title="swatch.label" @select="emit('changeMemberColor', m.id, swatch.color, swatch.bg)">
                            <template #leading><span class="color-dot" :style="{ backgroundColor: swatch.color }" /></template>
                          </DexDropdownMenuItem>
                        </DexDropdownMenuSubItem>
                        <DexDropdownMenuSeparator />
                        <DexDropdownMenuItem leading-icon="trash" title="Delete member" variant="danger" @select="deleteConfirmId = m.id" />
                      </template>
                    </DexDropdownMenu>
                  </div>
                </div>
              </template>
            </DexListItem>
          </template>
        </template>
      </DexList>

    </DexBox>

    <!-- Event types -->
    <DexBox
      padding="150"
      :style="{ borderTop: '1px solid var(--dex-borderColor-alpha-subtle)' }"
    >
      <DexList border="none">
        <DexListHeading>
          <template #title>
            <div class="flex items-center w-full">
              <button
                class="flex-1 text-left hover:opacity-70 transition-opacity"
                @click="typesExpanded = !typesExpanded"
              >
                Event types
              </button>
              <div class="flex items-center gap-0.5 ml-auto">
                <DexDropdownMenu>
                  <template #default>
                    <DexIconButton name="more-horizontal" label="Event type options" size="dense" />
                  </template>
                  <template #content>
                    <DexDropdownMenuItem leading-icon="check" title="Select all" @select="emit('update:visibleTypes', allTypes.map(l => l.name))" />
                    <DexDropdownMenuItem leading-icon="x" title="Deselect all" @select="emit('update:visibleTypes', [])" />
                  </template>
                </DexDropdownMenu>
                <button class="hover:opacity-70 transition-opacity p-0.5" @click="typesExpanded = !typesExpanded">
                  <svg
                    class="w-3.5 h-3.5 transition-transform duration-200 flex-shrink-0"
                    :style="{ transform: typesExpanded ? 'rotate(0deg)' : 'rotate(-90deg)' }"
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                  </svg>
                </button>
              </div>
            </div>
          </template>
        </DexListHeading>

        <!-- Manage button -->
        <div v-show="typesExpanded" class="sidebar-manage-row">
          <DexButton variant="transparent" size="sm" @click="emit('manageTypes')">
            Manage event types
          </DexButton>
        </div>

        <DexListItem
          v-for="link in allTypes"
          v-show="typesExpanded"
          :key="link.id"
          :title="link.name"
          :description="link.duration"
          border="none"
        >
          <template #leading>
            <DexCheckbox
              :checked="visibleTypes.includes(link.name)"
              @update:checked="emit('toggleType', link.name)"
              @click.stop
            />
          </template>
          <template #trailing>
            <div class="member-actions">
              <DexDropdownMenu>
                <template #default>
                  <DexIconButton name="more-horizontal" :label="`Options for ${link.name}`" size="dense" @click.stop />
                </template>
                <template #content>
                  <DexDropdownMenuItem leading-icon="pencil"   title="Edit"      @select="emit('editType', link.id)" />
                  <DexDropdownMenuItem leading-icon="send"     title="Send link" @select="navigator.clipboard?.writeText(bookingUrl(link))" />
                  <DexDropdownMenuItem leading-icon="calendar" title="New appointment" @select="emit('new-appointment', link.name)" />
                </template>
              </DexDropdownMenu>
            </div>
          </template>
        </DexListItem>
      </DexList>

    </DexBox>

  </aside>

  <!-- Remove confirmation modal -->
  <DexModal :open="deleteConfirmId !== null" @update:open="v => !v && (deleteConfirmId = null)">
    <DexModalContent>
      <DexModalHeading title="Remove team member?" />
      <DexModalBody>
        <DexStack gap="100">
          <DexText variant="body-2">
            <strong>{{ deleteConfirmMember?.name }}</strong> will be permanently removed from your team.
          </DexText>
          <DexText variant="body-2" color="subtle">
            Their appointments will remain on the calendar but will appear unassigned.
          </DexText>
        </DexStack>
      </DexModalBody>
      <DexModalFooter>
        <DexButtonGroup>
          <DexButton variant="solid" color="danger" @click="confirmDelete">Remove</DexButton>
          <DexButton variant="transparent" @click="deleteConfirmId = null">Cancel</DexButton>
        </DexButtonGroup>
      </DexModalFooter>
    </DexModalContent>
  </DexModal>

</template>

<style scoped>
:deep(.dex-list-heading .dex-text-headline-3) {
  width: 100%;
  font-size: var(--dex-text-body-2-fontSize);
  font-weight: var(--dex-font-weight-semibold);
  line-height: var(--dex-text-body-2-lineHeight);
  letter-spacing: normal;
  text-transform: none;
}
:deep(.dex-list-item-leading) {
  align-self: center;
}

:deep(.dex-list-item-title) {
  font-size: 14px !important;
  line-height: 1.43 !important;
}

:deep(.dex-list-item-description) {
  font-size: 12px !important;
  line-height: 1.33 !important;
}

.member-trailing {
  display: flex;
  align-items: center;
  gap: 4px;
}
.member-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.member-actions {
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.15s ease;
  display: flex;
  align-items: center;
}
:deep(.dex-list-item:hover) .member-actions {
  opacity: 1;
  pointer-events: auto;
}
.member-actions:has([data-state="open"]) {
  opacity: 1;
  pointer-events: auto;
}

.group-role-label {
  padding: 8px 12px 2px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.color-dot {
  display: inline-block;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
}

.sidebar-manage-row {
  padding: 0 4px 4px;
}
</style>
