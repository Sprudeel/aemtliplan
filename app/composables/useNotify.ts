/** Toasts with translated texts; API error codes map to `errors.<CODE>` keys. */
export function useNotify() {
  const toast = useToast();
  const { t, te } = useI18n();

  function success(key: string, params: Record<string, unknown> = {}) {
    toast.add({ title: t(key, params), color: "success", icon: "i-lucide-circle-check" });
  }

  function error(err: unknown, fallbackKey = "errors.GENERIC") {
    const code = errorCode(err);
    const key = code && te(`errors.${code}`) ? `errors.${code}` : fallbackKey;
    toast.add({
      title: t(key, { names: errorNames(err) }),
      color: "error",
      icon: "i-lucide-circle-alert",
    });
  }

  /** Runs an action and shows a success or error toast. Returns false on error. */
  async function run(action: () => Promise<unknown>, successKey?: string, params?: Record<string, unknown>) {
    try {
      await action();
      if (successKey) success(successKey, params);
      return true;
    } catch (err) {
      error(err);
      return false;
    }
  }

  return { success, error, run };
}
