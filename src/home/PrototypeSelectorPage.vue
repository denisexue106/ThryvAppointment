<script setup lang="ts">
import { DexText, DexBox, DexStack, DexInline, DexCard, DexIcon } from '@thryvlabs/dex-vue';
</script>

<template>
  <div class="ps-page">
    <div class="ps-hero">
      <DexText variant="display-2" as="h1">Appointments Calendar</DexText>
      <DexText variant="body-1" color="subtle" class="ps-subtitle">
        Two prototypes, two booking experiences — pick one to explore.
      </DexText>
    </div>

    <div class="ps-cards">
      <!-- Prototype A -->
      <a href="/appointments/#A" class="ps-link">
        <DexCard elevation="subtle" class="ps-card ps-card--a">
          <div class="ps-card-inner">
            <div class="ps-badge ps-badge--a">A</div>
            <DexStack gap="100">
              <DexText variant="headline-3" as="h2" class="ps-card-title">Future Vision</DexText>
              <DexText variant="body-2" color="subtle">
                A guided, two-step modal experience — capture appointment details first,
                then schedule the time slot.
              </DexText>
            </DexStack>

            <div class="ps-features">
              <div class="ps-feature">
                <DexIcon name="check-circle" size="sm" color="success" />
                <DexText variant="body-2">Step-by-step flow</DexText>
              </div>
              <div class="ps-feature">
                <DexIcon name="check-circle" size="sm" color="success" />
                <DexText variant="body-2">Two-column layout</DexText>
              </div>
              <div class="ps-feature">
                <DexIcon name="check-circle" size="sm" color="success" />
                <DexText variant="body-2">Inline team assignment</DexText>
              </div>
            </div>

            <div class="ps-cta">
              <DexText variant="body-2" color="primary" class="ps-cta-text">
                Open Prototype A
              </DexText>
              <DexIcon name="arrow-right" size="sm" color="primary" />
            </div>
          </div>
        </DexCard>
      </a>

      <!-- Prototype B -->
      <a href="/appointments/#B" class="ps-link">
        <DexCard elevation="subtle" class="ps-card ps-card--b">
          <div class="ps-card-inner">
            <div class="ps-badge ps-badge--b">B</div>
            <DexStack gap="100">
              <DexText variant="headline-3" as="h2" class="ps-card-title">MVP</DexText>
              <DexText variant="body-2" color="subtle">
                Everything on one page — fill in details and pick a time slot all at once,
                with no back-and-forth.
              </DexText>
            </DexStack>

            <div class="ps-features">
              <div class="ps-feature">
                <DexIcon name="check-circle" size="sm" color="success" />
                <DexText variant="body-2">Single-page form</DexText>
              </div>
              <div class="ps-feature">
                <DexIcon name="check-circle" size="sm" color="success" />
                <DexText variant="body-2">Schedule visible upfront</DexText>
              </div>
              <div class="ps-feature">
                <DexIcon name="check-circle" size="sm" color="success" />
                <DexText variant="body-2">Faster booking flow</DexText>
              </div>
            </div>

            <div class="ps-cta">
              <DexText variant="body-2" color="primary" class="ps-cta-text">
                Open Prototype B
              </DexText>
              <DexIcon name="arrow-right" size="sm" color="primary" />
            </div>
          </div>
        </DexCard>
      </a>
    </div>
  </div>
</template>

<style scoped>
.ps-page {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--dex-spacing-400);
  padding: var(--dex-spacing-400);
  background: var(--dex-surface-recessed-bgColor);
}

.ps-hero {
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--dex-spacing-100);
}

.ps-subtitle {
  max-width: 460px;
}

.ps-cards {
  display: flex;
  gap: var(--dex-spacing-300);
  align-items: stretch;
}

.ps-link {
  text-decoration: none;
  display: block;
  width: 320px;
}

.ps-card {
  height: 100%;
  transition: box-shadow 0.18s ease, transform 0.18s ease;
  cursor: pointer;
}

.ps-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

.ps-card-inner {
  padding: var(--dex-spacing-300);
  display: flex;
  flex-direction: column;
  gap: var(--dex-spacing-200);
  height: 100%;
}

.ps-badge {
  width: 40px;
  height: 40px;
  border-radius: var(--dex-borderRadius-100);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: 700;
  font-family: inherit;
  flex-shrink: 0;
}

.ps-badge--a {
  background: var(--dex-bgColor-accent-blue-subtle);
  color: var(--dex-fgColor-accent-blue);
}

.ps-badge--b {
  background: var(--dex-bgColor-accent-purple-subtle, rgba(138, 80, 255, 0.1));
  color: var(--dex-fgColor-accent-purple, #8a50ff);
}

.ps-card-title {
  margin: 0;
}

.ps-features {
  display: flex;
  flex-direction: column;
  gap: var(--dex-spacing-075);
  flex: 1;
}

.ps-feature {
  display: flex;
  align-items: center;
  gap: var(--dex-spacing-075);
}

.ps-cta {
  display: flex;
  align-items: center;
  gap: var(--dex-spacing-050);
  padding-top: var(--dex-spacing-100);
  border-top: 1px solid var(--dex-borderColor-alpha-subtle);
}

.ps-cta-text {
  font-weight: var(--dex-font-weight-medium) !important;
}
</style>
