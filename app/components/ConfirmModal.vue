<script setup lang="ts">
// Yes/no dialog for destructive actions. Usage: v-model:open + @confirm.
const props = withDefaults(
  defineProps<{ title: string; description?: string; confirmLabel?: string; loading?: boolean }>(),
  { description: undefined, confirmLabel: undefined, loading: false },
);
const emit = defineEmits<{ confirm: [] }>();
const open = defineModel<boolean>("open", { default: false });
const { t } = useI18n();
</script>

<template>
  <UModal v-model:open="open" :title="props.title" :description="props.description">
    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <UButton :label="t('actions.cancel')" color="neutral" variant="subtle" @click="open = false" />
        <UButton
          :label="props.confirmLabel ?? t('actions.delete')"
          color="error"
          :loading="props.loading"
          data-testid="confirm-button"
          @click="emit('confirm')"
        />
      </div>
    </template>
  </UModal>
</template>
