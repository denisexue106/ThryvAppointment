<script setup lang="ts">
import { ref, watchEffect, onMounted, onUnmounted, computed } from 'vue';
import {
  DexButton,
  DexInline,
  DexDropdownMenu,
  DexDropdownMenuItem,
  DexThryvLogo,
  DexText,
  DexIcon,
} from '@thryvlabs/dex-vue';
import { useRoute } from 'vue-router';

defineOptions({
  name: 'DexHeader',
});

function useMatchMedia(query: string) {
  const matches = ref(false);
  let mediaQuery: MediaQueryList | null = null;
  let handler: ((event: MediaQueryListEvent) => void) | null = null;

  onMounted(() => {
    mediaQuery = window.matchMedia(query);
    matches.value = mediaQuery.matches;

    handler = (event: MediaQueryListEvent) => {
      matches.value = event.matches;
    };

    mediaQuery.addEventListener('change', handler);
  });

  onUnmounted(() => {
    if (mediaQuery && handler) {
      mediaQuery.removeEventListener('change', handler);
    }
  });

  return matches;
}

const theme = ref(
  localStorage.getItem('dex-theme') || document.body.dataset.theme || 'keap',
);

const colorScheme = ref(
  localStorage.getItem('dex-color-scheme') ||
    document.body.dataset.colorScheme ||
    'system',
);

const isPrefersDarkMode = useMatchMedia('(prefers-color-scheme: dark)');

watchEffect(() => {
  document.body.dataset.theme = theme.value;
  localStorage.setItem('dex-theme', theme.value);
});

watchEffect(() => {
  localStorage.setItem('dex-color-scheme', colorScheme.value);
  if (colorScheme.value === 'system') {
    document.body.dataset.colorScheme = isPrefersDarkMode.value
      ? 'dark'
      : 'light';
  } else {
    document.body.dataset.colorScheme = colorScheme.value;
  }
});

function setThemeAndColorScheme(newTheme: string, newColorScheme: string) {
  theme.value = newTheme;
  colorScheme.value = newColorScheme;
}

// ── Version (A/B) selector ────────────────────────────────────────────────
const route = useRoute();
const isAppointments = computed(() => route.path.startsWith('/appointments'));

function getHashVariant(): 'A' | 'B' {
  return window.location.hash.toUpperCase().includes('B') ? 'B' : 'A';
}
const activeVersion = ref<'A' | 'B'>(getHashVariant());

function onHashChange() { activeVersion.value = getHashVariant(); }

onMounted(() => window.addEventListener('hashchange', onHashChange));
onUnmounted(() => window.removeEventListener('hashchange', onHashChange));

function selectVersion(v: 'A' | 'B') {
  window.location.href = `/appointments/#${v}`;
}
</script>

<template>
  <header class="header">
    <DexInline align-x="spread" align-y="center" stretch>
      <DexInline align-y="center" gap="200">
        <DexThryvLogo :style="{ width: '100px' }" />

      </DexInline>

      <DexInline gap="100" align-y="center">
        <DexDropdownMenu v-if="isAppointments" align="end">
          <template #default>
            <DexButton variant="transparent">
              Version {{ activeVersion }}
            </DexButton>
          </template>
          <template #content>
            <DexDropdownMenuItem @select="selectVersion('A')">
              <DexInline align-y="center" gap="100">
                <DexIcon v-if="activeVersion === 'A'" name="check" size="sm" />
                <span :style="activeVersion !== 'A' ? { paddingLeft: '20px' } : {}">Version A — Future Vision</span>
              </DexInline>
            </DexDropdownMenuItem>
            <DexDropdownMenuItem @select="selectVersion('B')">
              <DexInline align-y="center" gap="100">
                <DexIcon v-if="activeVersion === 'B'" name="check" size="sm" />
                <span :style="activeVersion !== 'B' ? { paddingLeft: '20px' } : {}">Version B — MVP</span>
              </DexInline>
            </DexDropdownMenuItem>
          </template>
        </DexDropdownMenu>

        <DexDropdownMenu align="end">
          <template #default>
            <DexButton variant="outline">Theme</DexButton>
          </template>
        <template #content>
          <DexDropdownMenuItem
            @select="setThemeAndColorScheme('keap', 'light')"
          >
            Keap Light
          </DexDropdownMenuItem>
          <DexDropdownMenuItem @select="setThemeAndColorScheme('keap', 'dark')">
            Keap Dark
          </DexDropdownMenuItem>
          <DexDropdownMenuItem
            @select="setThemeAndColorScheme('keap', 'system')"
          >
            Keap System
          </DexDropdownMenuItem>
          <DexDropdownMenuItem
            @select="setThemeAndColorScheme('maverick', 'light')"
          >
            Maverick Light
          </DexDropdownMenuItem>
          <DexDropdownMenuItem
            @select="setThemeAndColorScheme('maverick', 'dark')"
          >
            Maverick Dark
          </DexDropdownMenuItem>
          <DexDropdownMenuItem
            @select="setThemeAndColorScheme('maverick', 'system')"
          >
            Maverick System
          </DexDropdownMenuItem>
        </template>
        </DexDropdownMenu>
      </DexInline>
    </DexInline>
  </header>
</template>
