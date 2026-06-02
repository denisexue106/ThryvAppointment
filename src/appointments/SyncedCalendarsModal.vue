<script setup lang="ts">
import { ref } from 'vue'
import { teamMembers } from './data'
import {
  DexModal,
  DexModalContent,
  DexModalHeading,
  DexModalBody,
  DexStack,
  DexInline,
  DexBox,
  DexText,
  DexButton,
  DexIconButton,
  DexIcon,
  DexAvatar,
  DexStatus,
  DexDivider,
  DexInlineAlert,
  DexConfirmDialog,
  DexConfirmDialogContent,
} from '@thryvlabs/dex-vue'

defineOptions({ name: 'SyncedCalendarsModal' })

defineProps<{ open: boolean }>()
const emit = defineEmits<{ 'update:open': [value: boolean] }>()

// ── Types ─────────────────────────────────────────────────────────────
type Provider = 'google' | 'outlook'
type SyncStatus = 'active' | 'syncing' | 'error'

interface SyncedCalendar {
  id: string
  memberId: string
  email: string
  provider: Provider
  status: SyncStatus
  errorMessage?: string
}

// ── Helpers ───────────────────────────────────────────────────────────
function memberById(id: string) {
  return teamMembers.find(m => m.id === id) ?? teamMembers[0]
}

function memberEmail(id: string): string {
  const m = memberById(id)
  return m.email ?? `${m.name.toLowerCase().replace(' ', '.')}@summithvac.com`
}

// ── State: seed all team members as connected ─────────────────────────
const calendars = ref<SyncedCalendar[]>(
  teamMembers.map((m, i) => ({
    id:       `cal-${m.id}`,
    memberId: m.id,
    email:    memberEmail(m.id),
    provider: 'google' as Provider,
    status:   'active' as SyncStatus,
  }))
)

const disconnectId    = ref<string | null>(null)
const connecting      = ref<Provider | null>(null)
const connectError    = ref<string | null>(null)


// ── Provider metadata ─────────────────────────────────────────────────
const PROVIDERS: Record<Provider, { label: string; icon: string; color: string }> = {
  google:  { label: 'Google Calendar',  icon: 'google',    color: '#1a73e8' },
  outlook: { label: 'Outlook Calendar', icon: 'microsoft', color: '#0078d4' },
}

// ── Helpers ───────────────────────────────────────────────────────────
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

// ── Actions ───────────────────────────────────────────────────────────
function confirmDisconnect() {
  if (!disconnectId.value) return
  calendars.value = calendars.value.filter(c => c.id !== disconnectId.value)
  disconnectId.value = null
}

async function connectProvider(provider: Provider, email: string) {
  connecting.value = provider
  connectError.value = null
  try {
    // Scaffold: replace with real OAuth redirect/popup per provider
    await new Promise(r => setTimeout(r, 1800))
    const newCal: SyncedCalendar = {
      id:       `cal-${Date.now()}`,
      memberId: '',
      email,
      provider,
      status:   'syncing',
    }
    calendars.value.push(newCal)
    setTimeout(() => { newCal.status = 'active' }, 2500)
  } catch {
    connectError.value = `Could not connect to ${PROVIDERS[provider].label}. Please try again.`
  } finally {
    connecting.value = null
  }
}

const connectGoogle  = () => connectProvider('google',  'user@summithvac.com')
const connectOutlook = () => connectProvider('outlook', 'user@summithvac.com')
</script>

<template>
  <!-- ── Synced Calendars modal ──────────────────────────────────────── -->
  <DexModal :open="open" @update:open="emit('update:open', $event)">
    <DexModalContent>
      <DexModalHeading title="Connect calendars" />

      <DexModalBody>
        <DexStack gap="300">

          <!-- ── Section 1: Connect calendar ────────────────────────────── -->
          <DexStack gap="150">
            <DexStack gap="025">
              <DexText variant="headline-4">Connect calendar</DexText>
              <DexText variant="body-2" color="subtle">
                Send a sync invitation to connect a team member's calendar.
              </DexText>
            </DexStack>

            <DexButton
              variant="solid"
              leading-icon="add"
              :disabled="connecting !== null"
              :style="{ alignSelf: 'flex-start' }"
              @click="connectGoogle"
            >
              {{ connecting !== null ? 'Connecting…' : 'Connect calendar' }}
            </DexButton>
          </DexStack>

          <DexDivider />

          <!-- ── Section 2: Connected Calendars ─────────────────────────── -->
          <DexStack gap="150">
            <DexStack gap="025">
              <DexText variant="headline-4">Connected calendars</DexText>
              <DexText variant="body-2" color="subtle">
                Calendars currently synced to your Thryv account
              </DexText>
            </DexStack>

            <!-- Connection error -->
            <DexInlineAlert
              v-if="connectError"
              variant="danger"
              @close="connectError = null"
            >
              {{ connectError }}
            </DexInlineAlert>

            <!-- Empty state -->
            <DexBox
              v-if="calendars.length === 0"
              padding="200"
              :style="{
                border: '1px dashed var(--dex-borderColor-default)',
                borderRadius: 'var(--dex-borderRadius-100)',
                textAlign: 'center',
              }"
            >
              <DexStack gap="050">
                <DexIcon name="calendar" :size="24" :style="{ color: 'var(--dex-fgColor-subtle)', margin: '0 auto' }" />
                <DexText variant="body-2" color="subtle">
                  No calendars connected yet.
                </DexText>
              </DexStack>
            </DexBox>

            <!-- Calendar rows -->
            <DexStack v-else gap="100">
              <div
                v-for="cal in calendars"
                :key="cal.id"
                class="calendar-row"
              >
                <DexInline align-y="center" gap="150" stretch>
                  <DexAvatar :name="memberById(cal.memberId).name" size="md" />
                  <DexStack gap="050" :style="{ flex: '1', minWidth: '0' }">
                    <DexText
                      variant="body-2"
                      weight="semibold"
                      :style="{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }"
                    >
                      {{ memberById(cal.memberId).name }}
                    </DexText>
                    <DexInline gap="100" align-y="center">
                      <DexText
                        variant="caption"
                        color="subtle"
                        :style="{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }"
                      >
                        {{ cal.email }}
                      </DexText>
                      <DexStatus :variant="statusVariant(cal.status)" :leading-icon="true">
                        {{ statusLabel(cal.status) }}
                      </DexStatus>
                    </DexInline>
                  </DexStack>
                  <DexIconButton
                    name="trash"
                    :label="`Disconnect ${cal.email}`"
                    size="dense"
                    variant="transparent"
                    @click.stop="disconnectId = cal.id"
                  />
                </DexInline>
              </div>
            </DexStack>
          </DexStack>

        </DexStack>
      </DexModalBody>
    </DexModalContent>
  </DexModal>

  <!-- ── Disconnect confirmation ────────────────────────────────────── -->
  <DexConfirmDialog
    :open="disconnectId !== null"
    @update:open="v => !v && (disconnectId = null)"
  >
    <DexConfirmDialogContent
      title="Disconnect calendar?"
      description="Are you sure you want to disconnect this calendar? Events will no longer sync between Thryv and this calendar."
      confirm-text="Disconnect"
      cancel-text="Keep connected"
      variant="danger"
      @confirm="confirmDisconnect"
      @cancel="disconnectId = null"
    />
  </DexConfirmDialog>
</template>

<style scoped>

/* Connected calendar row */
.calendar-row {
  padding: var(--dex-spacing-100) var(--dex-spacing-100);
  border-radius: var(--dex-borderRadius-075);
  border: 1px solid var(--dex-borderColor-default);
  background-color: var(--dex-surface-flat-bgColor);
}


</style>
