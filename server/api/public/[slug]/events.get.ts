import { createEventStream, defineEventHandler, getRouterParam } from "h3";
import { onPlanChanged } from "../../../utils/plan-events";
import { findPublicPlan } from "../../../utils/public-plan";

const HEARTBEAT_MS = 25_000;

// Server-sent events for the public page: sends "changed" after rotations and edits,
// the page then refetches /api/public/:slug. Heartbeats keep proxies from closing it.
export default defineEventHandler(async (event) => {
  const settings = await findPublicPlan(getRouterParam(event, "slug") ?? "");
  const stream = createEventStream(event);

  const unsubscribe = onPlanChanged(settings.planId, (change) => {
    void stream.push({ event: "changed", data: JSON.stringify({ reason: change.reason, at: change.at }) });
  });
  const heartbeat = setInterval(() => void stream.push({ event: "ping", data: "" }), HEARTBEAT_MS);

  stream.onClosed(async () => {
    clearInterval(heartbeat);
    unsubscribe();
    await stream.close();
  });

  // Not awaited: a write only resolves once the client reads, which starts with send().
  void stream.push({ event: "ready", data: "" });
  return stream.send();
});
