<script setup lang="ts">
import { RouterLink, useRoute } from 'vue-router'
import { DexIcon, DexText } from '@thryvlabs/dex-vue'

defineOptions({ name: 'AppNav' })

interface NavItem {
  label: string
  path: string
  icon: string
  exact?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Home',       path: '/',             icon: 'home',     exact: true },
  { label: 'Contacts',   path: '/contacts',     icon: 'contact-user' },
  { label: 'My Day',     path: '/appointments', icon: 'calendar'  },
  { label: 'Automation', path: '/automations',  icon: 'zap'       },
]

const route = useRoute()

function isActive(item: NavItem): boolean {
  if (item.exact) return route.path === item.path
  return route.path.startsWith(item.path)
}
</script>

<template>
  <nav class="app-nav">
    <ul class="app-nav__list">
      <li v-for="item in NAV_ITEMS" :key="item.path">
        <RouterLink
          :to="item.path"
          class="app-nav__item"
          :class="{ 'app-nav__item--active': isActive(item) }"
        >
          <DexIcon :name="item.icon" :size="24" />
          <DexText variant="body-2" as="span" class="app-nav__label">{{ item.label }}</DexText>
        </RouterLink>
      </li>
    </ul>
  </nav>
</template>

<style scoped>
.app-nav {
  --nav-bg:              var(--dex-surface-flat-bgColor);
  --nav-active-bg:       rgba(250, 96, 0, 0.08);
  --nav-active-hover-bg: rgba(250, 96, 0, 0.14);
  --nav-active-fg:       var(--dex-fgColor-default);
  --nav-active-bar:      #FA6000;
  --nav-hover-bg:        var(--dex-bgColor-transparent-hover);
  --nav-fg-subtle:       var(--dex-fgColor-subtle);
  --nav-fg:              var(--dex-fgColor-default);
  --nav-border:          var(--dex-borderColor-alpha-subtle);
}

.app-nav {
  grid-area: nav;
  background-color: var(--nav-bg);
  width: 88px;
  min-width: 88px;
  max-width: 88px;
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--nav-border);
  overflow: hidden;
}

.app-nav__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--dex-spacing-025);
}

.app-nav__item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  width: 100%;
  padding: 8px var(--dex-spacing-025);
  border-radius: var(--dex-borderRadius-050);
  color: var(--nav-fg-subtle);
  text-decoration: none;
  transition: background-color 0.15s ease, color 0.15s ease;
  overflow: hidden;
}

.app-nav__item:hover {
  background-color: var(--nav-hover-bg);
  color: var(--nav-fg);
}

.app-nav__item--active {
  position: relative;
  background-color: var(--nav-active-bg);
  color: var(--nav-active-fg);
  border-radius: 0 var(--dex-borderRadius-050) var(--dex-borderRadius-050) 0;
}

.app-nav__item--active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background-color: var(--nav-active-bar);
  border-radius: 0 2px 2px 0;
}

.app-nav__item--active:hover {
  background-color: var(--nav-active-hover-bg);
}

.app-nav__label {
  color: inherit !important;
  font-size: 11px !important;
  font-weight: var(--dex-font-weight-medium) !important;
  line-height: 1.2;
  text-align: center;
  white-space: nowrap;
}
</style>
