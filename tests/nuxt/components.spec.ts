import { mountSuspended, registerEndpoint } from "@nuxt/test-utils/runtime";
import { describe, expect, test, vi } from "vitest";
import GroupChip from "~/components/GroupChip.vue";
import JobIcon from "~/components/JobIcon.vue";
import RotationSummary from "~/components/RotationSummary.vue";
import StatsGrid from "~/components/dashboard/StatsGrid.vue";
import RotationPreview from "~/components/dashboard/RotationPreview.vue";
import NextRotationCard from "~/components/dashboard/NextRotationCard.vue";
import type { AssignmentDto, GroupDto, PlanDto } from "~~/shared/types/api";

const group = (id: number, name: string, inRotation = true): GroupDto => ({
  id,
  name,
  color: "#0014A8",
  inRotation,
  idleSince: null,
  members: [],
});

const session = {
  user: { id: "u1", name: "Admin", email: "admin@example.test", emailVerified: true },
  session: { id: "s1", expiresAt: "2099-01-01T00:00:00.000Z" },
};
registerEndpoint("/api/auth/get-session", () => session);
registerEndpoint("/api/auth/organization/list", () => []);

describe("GroupChip", () => {
  test("shows the name on the group color with readable text", async () => {
    const wrapper = await mountSuspended(GroupChip, { props: { group: { name: "Wölfe", color: "#0014A8" } } });
    expect(wrapper.text()).toBe("Wölfe");
    const style = wrapper.find("span").attributes("style");
    expect(style?.toLowerCase()).toContain("background-color: #0014a8");
    expect(style?.toLowerCase()).toContain("color: #ffffff");
  });

  test("null shows 'niemand'", async () => {
    const wrapper = await mountSuspended(GroupChip, { props: { group: null } });
    expect(wrapper.text()).toBe("niemand");
  });
});

describe("JobIcon", () => {
  test("emoji is shown as text", async () => {
    const wrapper = await mountSuspended(JobIcon, { props: { icon: "🧹" } });
    expect(wrapper.text()).toBe("🧹");
  });

  test("Iconify name is shown as icon, not as text", async () => {
    const wrapper = await mountSuspended(JobIcon, { props: { icon: "i-lucide-broom" } });
    expect(wrapper.text()).toBe("");
    expect(wrapper.html()).toContain("broom");
  });
});

describe("StatsGrid", () => {
  test("counts Ämtli, open Ämtli, groups in rotation and idle groups", async () => {
    const g1 = group(1, "A");
    const assignments: AssignmentDto[] = [
      { jobId: 1, group: g1 },
      { jobId: 2, group: null },
    ];
    const groups = [g1, group(2, "B"), group(3, "C", false)];
    const wrapper = await mountSuspended(StatsGrid, { props: { assignments, groups } });
    const value = (key: string) => wrapper.find(`[data-testid="stat-${key}"]`).text();
    expect(value("jobs")).toContain("2");
    expect(value("open")).toContain("1");
    expect(value("groups")).toContain("2");
    expect(value("idle")).toContain("1"); // B is in rotation without Ämtli; C is paused
  });
});

describe("RotationPreview", () => {
  test("lists each Ämtli with current and next group", async () => {
    const wrapper = await mountSuspended(RotationPreview, {
      props: {
        jobs: [{ id: 7, name: "Küche", icon: "🍽️", description: null, position: 0 }],
        preview: [{ jobId: 7, current: group(1, "Wölfe"), next: group(2, "Füchse") }],
      },
    });
    const text = wrapper.find('[data-testid="rotation-preview"]').text();
    expect(text).toContain("Küche");
    expect(text.indexOf("Wölfe")).toBeLessThan(text.indexOf("Füchse"));
  });
});

describe("RotationSummary", () => {
  test("shows trigger, number of changes and undo state", async () => {
    const wrapper = await mountSuspended(RotationSummary, {
      props: {
        rotation: {
          id: 1,
          at: "2026-11-02T16:00:00.000Z",
          trigger: "schedule",
          byUserId: null,
          before: [{ jobId: 1, groupId: 1 }, { jobId: 2, groupId: 2 }],
          after: [{ jobId: 1, groupId: 2 }, { jobId: 2, groupId: 1 }],
          undoneAt: "2026-11-02T16:05:00.000Z",
        },
      },
    });
    const text = wrapper.text();
    expect(text).toContain("Automatisch");
    expect(text).toContain("2 Änderungen");
    expect(text).toContain("rückgängig gemacht");
  });
});

describe("NextRotationCard", () => {
  const plan = (overrides: Partial<PlanDto>): PlanDto => ({
    id: "p1",
    name: "Lager",
    slug: "lager",
    myRole: "admin",
    nextRotationAt: null,
    settings: {
      timezone: "Europe/Zurich",
      rotationEnabled: false,
      rotationTime: "17:00",
      idlePolicy: "slots",
      visibility: "private",
      publicSlug: "abc",
      showMemberNames: false,
      memberLogin: false,
      backgroundUrl: null,
    },
    ...overrides,
  });

  test("schedule off: says so and links admins to the settings", async () => {
    registerEndpoint("/api/plans/p1", () => plan({}));
    const wrapper = await mountSuspended(NextRotationCard, { route: "/plans/p1" });
    // The card loads the plan without blocking; wait until it is there.
    await vi.waitFor(() => expect(wrapper.text()).toContain("Zeitplan festlegen"));
    expect(wrapper.text()).toContain("Automatische Rotation ist aus.");
    expect(wrapper.text()).toContain("Zeitplan festlegen");
    expect(wrapper.find('[data-testid="rotate-now"]').exists()).toBe(true);
  });

  test("viewer sees the next run but no rotate button", async () => {
    const next = new Date(Date.now() + 26.5 * 3600 * 1000).toISOString(); // 1 day, 2 h, 30 min
    registerEndpoint("/api/plans/p2", () => plan({ id: "p2", myRole: "viewer", nextRotationAt: next }));
    const wrapper = await mountSuspended(NextRotationCard, { route: "/plans/p2" });
    await vi.waitFor(() => expect(wrapper.text()).toMatch(/in 1 Tag 2 Std\./));
    expect(wrapper.find('[data-testid="rotate-now"]').exists()).toBe(false);
  });
});
