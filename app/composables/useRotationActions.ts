import type { RotationDto } from "~~/shared/types/api";

/** "Rotate now" and "undo", with toasts; refreshes all plan data afterwards. */
export function useRotationActions() {
  const api = usePlanApiBase();
  const notify = useNotify();
  const toast = useToast();
  const { t } = useI18n();
  const busy = ref(false);

  async function undo(rotationId: number) {
    busy.value = true;
    try {
      await plainFetch(`${api.value}/rotations/${rotationId}/undo`, { method: "POST" });
      notify.success("rotation.undone");
      await refreshNuxtData();
    } catch (error) {
      notify.error(error);
    } finally {
      busy.value = false;
    }
  }

  async function rotateNow() {
    busy.value = true;
    try {
      const log = await plainFetch<RotationDto>(`${api.value}/rotations`, { method: "POST", body: { steps: 1 } });
      await refreshNuxtData();
      toast.add({
        title: t("rotation.done"),
        color: "success",
        icon: "i-lucide-refresh-cw",
        actions: [{ label: t("rotation.undo"), icon: "i-lucide-undo-2", color: "neutral", variant: "outline", onClick: () => undo(log.id) }],
      });
    } catch (error) {
      notify.error(error);
    } finally {
      busy.value = false;
    }
  }

  return { busy, rotateNow, undo };
}
