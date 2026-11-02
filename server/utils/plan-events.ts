import { EventEmitter } from "node:events";

// In-process bus: lets the public page's SSE stream know when assignments changed.
// Works for a single server instance (our deployment model).
const bus = new EventEmitter();
bus.setMaxListeners(0);

export interface PlanChange {
  planId: string;
  reason: "rotation" | "undo" | "assignment" | "jobs" | "groups" | "settings";
  at: string;
}

export function emitPlanChanged(planId: string, reason: PlanChange["reason"]) {
  bus.emit(`plan:${planId}`, { planId, reason, at: new Date().toISOString() } satisfies PlanChange);
}

export function onPlanChanged(planId: string, listener: (change: PlanChange) => void) {
  bus.on(`plan:${planId}`, listener);
  return () => bus.off(`plan:${planId}`, listener);
}
