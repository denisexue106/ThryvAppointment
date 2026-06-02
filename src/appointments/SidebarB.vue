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
  DexCard,
  DexTag,
  DexIcon,
  DexDropdownMenu,
  DexDropdownMenuItem,
  DexDropdownMenuSeparator,
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

// ── Search ────────────────────────────────────────────────────────────────
const search = ref('')

// ── Filter by owner ───────────────────────────────────────────────────────
const filterOwnerIds = ref<Set<string>>(new Set())

function toggleOwnerFilter(id: string) {
  const s = new Set(filterOwnerIds.value)
  s.has(id) ? s.delete(id) : s.add(id)
  filterOwnerIds.value = s
}

const filterActive = computed(() => filterOwnerIds.value.size > 0)

const filteredLinks = computed(() => {
  const q = search.value.trim().toLowerCase()
  let list = props.allTypes
  if (q) list = list.filter(l => l.name.toLowerCase().includes(q))
  if (filterOwnerIds.value.size > 0) {
    list = list.filter(l =>
      l.memberIds?.some(id => filterOwnerIds.value.has(id))
    )
  }
  return list
})

// ── Booking URL ───────────────────────────────────────────────────────────
function bookingUrl(link: BookingLink) {
  const slug = link.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
  return `summithvac.com/book/${slug}`
}

// ── Assigned member ───────────────────────────────────────────────────────
function assignedMember(link: BookingLink): TeamMember | null {
  if (!link.memberIds?.length) return null
  return props.teamMembers.find(m => link.memberIds!.includes(m.id)) ?? null
}

function memberInitials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

// ── Delete confirmation ───────────────────────────────────────────────────
const deleteConfirmId = ref<string | null>(null)

const deleteConfirmLink = computed(() =>
  props.allTypes.find(l => l.id === deleteConfirmId.value) ?? null
)

function confirmDelete() {
  if (deleteConfirmId.value) {
    emit('removeType', deleteConfirmId.value)
    deleteConfirmId.value = null
  }
}

// ── Send invite (copy URL) ────────────────────────────────────────────────
function sendInvite(link: BookingLink) {
  navigator.clipboard?.writeText('https://' + bookingUrl(link))
}
</script>

<template>
  <aside class="bl-sidebar">

    <!-- Section heading -->
    <div class="bl-section-heading">
      <DexText variant="headline-4">Booking links</DexText>
      <DexInline gap="000">
        <DexIconButton name="add" label="New booking link" @click="emit('new-appointment', '')" />
        <DexDropdownMenu align="end">
        <template #default>
          <DexIconButton
            name="filter"
            label="Filter by owner"
            :style="filterActive ? { color: 'var(--dex-fgColor-accent-blue)' } : {}"
          />
        </template>
        <template #content>
          <div class="bl-filter-heading">
            <DexText variant="caption" color="subtle" weight="semibold">Filter by owner</DexText>
          </div>
          <DexDropdownMenuItem
            v-for="m in teamMembers"
            :key="m.id"
            @select="toggleOwnerFilter(m.id)"
          >
            <template #leading>
              <div class="bl-filter-avatar">
                <DexIcon name="contact-user" size="sm" />
              </div>
            </template>
            <DexInline align-y="center" align-x="spread" stretch gap="200">
              <span>{{ m.name }}</span>
              <svg
                v-if="filterOwnerIds.has(m.id)"
                xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
                fill="currentColor" class="bl-filter-check"
              >
                <path fill-rule="evenodd" d="M20.707 6.293a1 1 0 0 1 0 1.414l-11 11a1 1 0 0 1-1.414 0l-5-5a1 1 0 1 1 1.414-1.414L9 16.586 19.293 6.293a1 1 0 0 1 1.414 0" clip-rule="evenodd"/>
              </svg>
            </DexInline>
          </DexDropdownMenuItem>
          <DexDropdownMenuSeparator v-if="filterActive" />
          <DexDropdownMenuItem v-if="filterActive" @select="filterOwnerIds = new Set()">
            <template #leading><DexIcon name="x" size="sm" /></template>
            Clear filter
          </DexDropdownMenuItem>
        </template>
        </DexDropdownMenu>
      </DexInline>
    </div>

    <!-- Search -->
    <div class="bl-search">
      <DexInput
        v-model="search"
        type="search"
        placeholder="Search"
        leading-icon="search"
        size="sm"
      />
    </div>

    <!-- Cards -->
    <div class="bl-cards">
      <DexCard
        v-for="link in filteredLinks"
        :key="link.id"
        elevation="subtle"
        class="bl-card"
      >
        <!-- NEW / incomplete state -->
        <template v-if="link.isNew">
          <div class="bl-card-body">
            <DexTag color="success" size="sm" class="bl-new-tag">New</DexTag>
            <DexText variant="body-2" weight="semibold">{{ link.name }}</DexText>
            <DexText variant="caption" color="subtle">{{ link.duration }}</DexText>
            <DexInline gap="100" class="bl-card-actions">
              <DexButton variant="outline" size="sm" @click="emit('editType', link.id)">Setup</DexButton>
              <DexButton variant="transparent" size="sm" color="danger" @click="deleteConfirmId = link.id">Delete</DexButton>
            </DexInline>
          </div>
        </template>

        <!-- Existing link state -->
        <template v-else>
          <div class="bl-card-body">
            <!-- Title row -->
            <DexInline align-x="spread" align-y="center" stretch>
              <DexText variant="body-2" weight="semibold">{{ link.name }}</DexText>
              <DexInline gap="000" align-y="center">
                <!-- Automation icon -->
                <DexIconButton
                  name="zap"
                  label="Automations"
                  size="dense"
                  color="warning"
                />
                <DexDropdownMenu align="end">
                  <template #default>
                    <DexIconButton name="more-horizontal" :label="`Options for ${link.name}`" size="dense" />
                  </template>
                  <template #content>
                    <DexDropdownMenuItem leading-icon="pencil"   title="Edit"             @select="emit('editType', link.id)" />
                    <DexDropdownMenuItem leading-icon="calendar" title="New appointment"  @select="emit('new-appointment', link.name)" />
                    <DexDropdownMenuSeparator />
                    <DexDropdownMenuItem leading-icon="trash"    title="Delete"  variant="danger" @select="deleteConfirmId = link.id" />
                  </template>
                </DexDropdownMenu>
              </DexInline>
            </DexInline>

            <!-- Duration -->
            <DexText variant="caption" color="subtle">{{ link.duration }}</DexText>

            <!-- Assigned member chip -->
            <div v-if="assignedMember(link)" class="bl-member-chip">
              <div
                class="bl-avatar"
                :style="{ backgroundColor: assignedMember(link)!.bg, color: assignedMember(link)!.color }"
              >
                {{ memberInitials(assignedMember(link)!.name) }}
              </div>
              <DexText variant="caption">{{ assignedMember(link)!.name }}</DexText>
            </div>

            <!-- Booking URL -->
            <a
              :href="'https://' + bookingUrl(link)"
              target="_blank"
              class="bl-url"
            >
              <DexText variant="caption" color="primary">{{ bookingUrl(link) }}</DexText>
            </a>

            <!-- Action buttons -->
            <DexInline gap="100" class="bl-card-actions">
              <DexButton variant="outline" size="sm" @click="emit('new-appointment', link.name)">
                <template #leading>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="bl-btn-icon"><path d="M19 4h-1V2h-2v2H8V2H6v2H5C3.89 4 3 4.9 3 6v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2z"/></svg>
                </template>
                Book now
              </DexButton>
              <DexButton variant="transparent" size="sm" @click="sendInvite(link)">
                <template #leading>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="bl-btn-icon"><path d="M2.01 21 23 12 2.01 3 2 10l15 2-15 2z"/></svg>
                </template>
                Send invite
              </DexButton>
            </DexInline>
          </div>
        </template>
      </DexCard>

      <!-- Empty state -->
      <div v-if="filteredLinks.length === 0" class="bl-empty">
        <DexText variant="body-2" color="subtle">No booking links found</DexText>
      </div>
    </div>

  </aside>

  <!-- Delete confirmation modal -->
  <DexModal :open="deleteConfirmId !== null" @update:open="v => !v && (deleteConfirmId = null)">
    <DexModalContent>
      <DexModalHeading title="Delete booking link?" />
      <DexModalBody>
        <DexStack gap="100">
          <DexText variant="body-2">
            <strong>{{ deleteConfirmLink?.name }}</strong> will be permanently deleted.
          </DexText>
          <DexText variant="body-2" color="subtle">
            Existing appointments of this type will remain on the calendar.
          </DexText>
        </DexStack>
      </DexModalBody>
      <DexModalFooter>
        <DexButtonGroup>
          <DexButton variant="solid" color="danger" @click="confirmDelete">Delete</DexButton>
          <DexButton variant="transparent" @click="deleteConfirmId = null">Cancel</DexButton>
        </DexButtonGroup>
      </DexModalFooter>
    </DexModalContent>
  </DexModal>
</template>

<style scoped>
.bl-sidebar {
  width: 360px;
  min-width: 360px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  border-right: 1px solid var(--dex-borderColor-alpha-subtle);
  background-color: var(--dex-surface-flat-bgColor, #fff);
}

/* Page title */
.bl-header {
  padding: 20px 16px 12px;
  border-bottom: 1px solid var(--dex-borderColor-alpha-subtle);
}

/* "Booking links" row */
.bl-section-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px 8px;
  border-bottom: 1px solid var(--dex-borderColor-alpha-subtle);
  margin-bottom: 4px;
}

/* Search bar */
.bl-search {
  padding: 0 12px 12px;
}
.bl-search :deep(.dex-stack) {
  width: 100%;
}
.bl-search :deep(.dex-input) {
  width: 100%;
}

/* Cards list */
.bl-cards {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 0 12px 16px;
  overflow-y: auto;
}

/* Individual card */
.bl-card {
  border-radius: var(--dex-borderRadius-100) !important;
}

.bl-card-body {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

/* "New" badge */
.bl-new-tag {
  align-self: flex-start;
  margin-bottom: 2px;
}

/* Assigned member chip */
.bl-member-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  background: var(--dex-bgColor-alpha-subtle);
  border: 1px solid var(--dex-borderColor-alpha-subtle);
  border-radius: 999px;
  padding: 2px 8px 2px 2px;
  align-self: flex-start;
}

.bl-avatar {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  font-size: 10px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-family: inherit;
}

/* Booking URL */
.bl-url {
  text-decoration: none;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: block;
}
.bl-url:hover span {
  text-decoration: underline;
}

/* Action buttons row */
.bl-card-actions {
  padding-top: 6px;
  border-top: 1px solid var(--dex-borderColor-alpha-subtle);
  margin-top: 2px;
}

/* Tiny icon inside button */
.bl-btn-icon {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
}

/* Empty state */
.bl-empty {
  padding: 24px 0;
  text-align: center;
}

/* Filter dropdown heading label */
.bl-filter-heading {
  padding: 8px 12px 4px;
}

/* Avatar circle in filter list */
.bl-filter-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--dex-bgColor-alpha-subtle);
  border: 1px solid var(--dex-borderColor-alpha-subtle);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: var(--dex-fgColor-subtle);
}

/* Checkmark in filter row */
.bl-filter-check {
  width: 16px;
  height: 16px;
  color: var(--dex-fgColor-accent-blue);
  flex-shrink: 0;
}
</style>
