import { defineEventHandler, getRouterParam } from "h3";
import { publicPlanView } from "../../../utils/public-plan";

// Public wall view of a plan (only when visibility = public). No login.
export default defineEventHandler((event) => publicPlanView(getRouterParam(event, "slug") ?? ""));
