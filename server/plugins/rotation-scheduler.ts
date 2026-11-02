import { runDueRotations } from "../utils/rotation-service";

const TICK_MS = 60_000;

// Checks every minute for plans whose daily rotation is due. Runs once at start to catch up.
export default defineNitroPlugin((nitroApp) => {
  if (process.env.ROTATION_SCHEDULER === "off") return;

  const tick = () =>
    runDueRotations().catch((error) => console.error("[scheduler] tick failed", error));

  tick();
  const timer = setInterval(tick, TICK_MS);
  nitroApp.hooks.hook("close", () => clearInterval(timer));
});
