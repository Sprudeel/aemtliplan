import { defineEventHandler } from "h3";
import { midataConfig } from "../utils/midata";

// Public feature flags for the UI (e.g. whether to show "Sign in with MiData").
export default defineEventHandler(() => ({
  midata: Boolean(midataConfig),
}));
