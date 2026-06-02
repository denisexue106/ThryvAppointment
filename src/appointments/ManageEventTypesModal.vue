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
} from '@thryvlabs/dex-vue'
import type { BookingLink } from './data'

defineOptions({ name: 'ManageEventTypesModal' })

const props = defineProps<{ bookingLinks: BookingLink[] }>()
const emit = defineEmits<{
  close: []
  addType: [link: BookingLink]
  updateType: [id: string, changes: Partial<Omit<BookingLink, 'id'>>]
  removeType: [id: string]
}>()

// ── Edit ──────────────────────────────────────────────────────────────
const editingId      = ref<string | null>(null)
const editName       = ref('')
const editDuration   = ref('')

function startEdit(link: BookingLink) {
  editingId.value    = link.id
  editName.value     = link.name
  editDuration.value = link.duration
}

function saveEdit() {
  if (!editingId.value || !editName.value.trim()) return
  emit('updateType', editingId.value, {
    name:     editName.value.trim(),
    duration: editDuration.value.trim(),
  })
  editingId.value = null
}

function cancelEdit() { editingId.value = null }

// ── Delete ────────────────────────────────────────────────────────────
const deleteId   = ref<string | null>(null)
const deleteLink = computed(() => props.bookingLinks.find(l => l.id === deleteId.value) ?? null)

function confirmDelete() {
  if (!deleteId.value) return
  emit('removeType', deleteId.value)
  if (editingId.value === deleteId.value) editingId.value = null
  deleteId.value = null
}

// ── Add ───────────────────────────────────────────────────────────────
const showAdd     = ref(false)
const newName     = ref('')
const newDuration = ref('')

const isDuplicate = computed(() =>
  newName.value.trim().length > 0 &&
  props.bookingLinks.some(l => l.name.toLowerCase() === newName.value.trim().toLowerCase())
)

function submitAdd() {
  if (!newName.value.trim() || isDuplicate.value) return
  emit('addType', {
    id:       `bl${Date.now()}`,
    name:     newName.value.trim(),
    duration: newDuration.value.trim(),
  })
  newName.value     = ''
  newDuration.value = ''
  showAdd.value     = false
}

function cancelAdd() {
  showAdd.value     = false
  newName.value     = ''
  newDuration.value = ''
}
</script>

<template>
  <DexModal :open="true" @update:open="v => { if (!v) emit('close') }">
    <DexModalContent size="sm">
      <DexModalHeading title="Manage event types" />

      <DexModalBody>
        <DexStack gap="100">

          <!-- Empty state -->
          <DexText v-if="bookingLinks.length === 0" variant="body-2" color="subtle">
            No event types yet. Add one below.
          </DexText>

          <!-- Link rows -->
          <div v-for="link in bookingLinks" :key="link.id" class="type-row">

            <!-- View mode -->
            <template v-if="editingId !== link.id">
              <DexInline align-y="center" gap="150" stretch>
                <DexStack gap="000" :style="{ flex: 1, minWidth: 0 }">
                  <DexText variant="body-2" :style="{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }">
                    {{ link.name }}
                  </DexText>
                  <DexText v-if="link.duration" variant="caption" color="subtle">{{ link.duration }}</DexText>
                </DexStack>
                <DexInline gap="050" align-y="center">
                  <DexIconButton name="pencil" :label="`Edit ${link.name}`" size="dense" variant="transparent" @click="startEdit(link)" />
                  <DexIconButton name="trash"  :label="`Remove ${link.name}`" size="dense" variant="transparent" @click="deleteId = link.id" />
                </DexInline>
              </DexInline>
            </template>

            <!-- Edit mode -->
            <template v-else>
              <DexStack gap="100">
                <DexInline gap="100" stretch align-y="end">
                  <DexInput
                    v-model="editName"
                    label="Name"
                    size="sm"
                    :style="{ flex: 1 }"
                    @keydown.enter="saveEdit"
                    @keydown.escape="cancelEdit"
                  />
                  <DexInput
                    v-model="editDuration"
                    label="Duration"
                    size="sm"
                    placeholder="e.g. 60 min"
                    :style="{ flex: '0 0 100px' }"
                    @keydown.enter="saveEdit"
                    @keydown.escape="cancelEdit"
                  />
                </DexInline>
                <DexInline gap="100">
                  <DexButton variant="solid" size="sm" :disabled="!editName.trim()" @click="saveEdit">Save</DexButton>
                  <DexButton variant="transparent" size="sm" @click="cancelEdit">Cancel</DexButton>
                </DexInline>
              </DexStack>
            </template>

          </div>

          <DexDivider v-if="bookingLinks.length > 0 && !showAdd" />

          <!-- Add form -->
          <div v-if="showAdd" class="add-form">
            <DexStack gap="100">
              <DexInline gap="100" stretch align-y="end">
                <DexInput
                  v-model="newName"
                  label="Name"
                  size="sm"
                  placeholder="e.g. Follow-up visit"
                  :style="{ flex: 1 }"
                  @keydown.enter="submitAdd"
                  @keydown.escape="cancelAdd"
                />
                <DexInput
                  v-model="newDuration"
                  label="Duration"
                  size="sm"
                  placeholder="e.g. 60 min"
                  :style="{ flex: '0 0 100px' }"
                  @keydown.enter="submitAdd"
                  @keydown.escape="cancelAdd"
                />
              </DexInline>
              <DexText v-if="isDuplicate" variant="caption" color="danger">
                A event type with this name already exists.
              </DexText>
              <DexInline gap="100">
                <DexButton variant="solid" size="sm" :disabled="!newName.trim() || isDuplicate" @click="submitAdd">
                  Add event type
                </DexButton>
                <DexButton variant="transparent" size="sm" @click="cancelAdd">Cancel</DexButton>
              </DexInline>
            </DexStack>
          </div>

          <!-- Add button -->
          <DexButton
            v-else
            variant="outline"
            leading-icon="add"
            :style="{ alignSelf: 'flex-start' }"
            @click="showAdd = true"
          >
            Add event type
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

  <!-- Remove confirmation -->
  <DexConfirmDialog
    :open="deleteId !== null"
    @update:open="v => !v && (deleteId = null)"
  >
    <DexConfirmDialogContent
      title="Remove event type?"
      :description="`'${deleteLink?.name ?? 'This event type'}' will be removed. Existing appointments with this type will remain but won't match any event type.`"
      confirm-text="Remove"
      cancel-text="Keep"
      variant="danger"
      @confirm="confirmDelete"
      @cancel="deleteId = null"
    />
  </DexConfirmDialog>
</template>

<style scoped>
.type-row {
  padding: var(--dex-spacing-100) var(--dex-spacing-100);
  border-radius: var(--dex-borderRadius-075);
  border: 1px solid var(--dex-borderColor-default);
  background-color: var(--dex-surface-flat-bgColor);
}

.add-form {
  padding: var(--dex-spacing-100) var(--dex-spacing-100);
  border-radius: var(--dex-borderRadius-075);
  border: 1px solid var(--dex-borderColor-default);
  background-color: var(--dex-surface-flat-bgColor);
}
</style>
