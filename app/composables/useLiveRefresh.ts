/**
 * Calls `onChange` when the server announces a change (SSE "changed" / "ready" after a
 * reconnect), plus a slow poll as fallback. Browser only; cleans up on unmount.
 */
export function useLiveRefresh(url: MaybeRefOrGetter<string>, onChange: () => void, pollMs = 5 * 60_000) {
  const connected = ref(false);
  let source: EventSource | null = null;
  let poll: ReturnType<typeof setInterval> | undefined;
  let seenReady = false;

  function open() {
    source?.close();
    source = new EventSource(toValue(url));
    source.addEventListener("ready", () => {
      connected.value = true;
      // After a reconnect we may have missed changes.
      if (seenReady) onChange();
      seenReady = true;
    });
    source.addEventListener("changed", () => onChange());
    source.onerror = () => {
      connected.value = false; // EventSource reconnects by itself
    };
  }

  onMounted(() => {
    open();
    poll = setInterval(onChange, pollMs);
  });
  onBeforeUnmount(() => {
    source?.close();
    clearInterval(poll);
  });

  return { connected };
}
