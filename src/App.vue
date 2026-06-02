<script setup lang="ts">
import {
  DexProvider,
  DexConfirmDialogViewport,
  DexNotificationViewport,
} from '@thryvlabs/dex-vue';
import Header from './Header.vue';
import Nav from './Nav.vue';
</script>

<template>
  <DexProvider>
    <div class="app dex-app">
      <Header />

      <Nav />

      <main class="main">
        <router-view />
      </main>
    </div>

    <DexConfirmDialogViewport />
    <DexNotificationViewport />
  </DexProvider>
</template>
