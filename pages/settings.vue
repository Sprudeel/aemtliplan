<script setup lang="ts">
definePageMeta({ layout: "app-shell", middleware: "auth" })
</script>

<template>
  <div class="settings-page">
    <v-container fluid class="px-0">
      <v-row class="gy-6">
        <v-col cols="12" md="8" lg="6">
          <SettingsCronSettings />
        </v-col>
        <v-col cols="12" md="8" lg="6">
          <SettingsPasswordChangeCard />
        </v-col>
        <v-col cols="12" md="8" lg="6">
          <SettingsBackgroundImageCard />
        </v-col>
      </v-row>
    </v-container>
  </div>
</template>

<style scoped>
.settings-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
}
</style>
