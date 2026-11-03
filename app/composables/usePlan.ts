import type {
  AppConfigDto,
  AssignmentDto,
  GroupDto,
  JobDto,
  PlanDto,
  PlanSummary,
} from "~~/shared/types/api";

export function usePlanId() {
  const route = useRoute();
  return computed(() => String(route.params.planId ?? ""));
}

/** Base path of the current plan's API, e.g. /api/plans/abc. */
export function usePlanApiBase() {
  const planId = usePlanId();
  return computed(() => `/api/plans/${planId.value}`);
}

/** The current plan incl. my role. Shared by all components via the same key. */
export function usePlan() {
  const planId = usePlanId();
  const requestFetch = useRequestFetch();
  const result = useAsyncData(
    () => `plan:${planId.value || "none"}`,
    () => (planId.value ? requestFetch<PlanDto>(`/api/plans/${planId.value}`) : Promise.resolve(null)),
    { watch: [planId] },
  );
  const isAdmin = computed(() => result.data.value?.myRole === "admin");
  return { ...result, plan: result.data, isAdmin };
}

/** Plans I belong to (sidebar switcher, plan list). */
export function useMyPlans() {
  const requestFetch = useRequestFetch();
  return useAsyncData("my-plans", () => requestFetch<PlanSummary[]>("/api/auth/organization/list"), {
    default: () => [],
  });
}

/** Loads a list endpoint of the current plan, e.g. usePlanList<GroupDto>("groups"). */
export function usePlanList<T>(path: string) {
  const planId = usePlanId();
  const requestFetch = useRequestFetch();
  return useAsyncData(
    () => `plan:${planId.value}:${path}`,
    () => requestFetch<T[]>(`/api/plans/${planId.value}/${path}`),
    { watch: [planId], default: () => [] as T[] },
  );
}

export const usePlanGroups = () => usePlanList<GroupDto>("groups");
export const usePlanJobs = () => usePlanList<JobDto>("jobs");
export const usePlanAssignments = () => usePlanList<AssignmentDto>("assignments");

/** Server feature flags, e.g. MiData login. */
export function useFeatureFlags() {
  const requestFetch = useRequestFetch();
  return useAsyncData("app-config", () => requestFetch<AppConfigDto>("/api/config"), {
    default: () => ({ midata: false }),
  });
}

/** Refetch everything that belongs to the current plan (after rotations etc.). */
export async function refreshPlanData() {
  await refreshNuxtData();
}
