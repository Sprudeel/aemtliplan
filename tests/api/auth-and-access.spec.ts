import { describe, expect, test } from "vitest";
import { addToPlan, Client, createPlan, lastMailLink, PASSWORD, prisma, seedPlan, signUp, verifyEmail } from "../helpers/api";

describe("accounts (better-auth)", () => {
  test("sign up, read session, sign out", async () => {
    const user = await signUp("Anna");
    const session = await user.client.get("/api/auth/get-session");
    expect(session.body.user.email).toBe(user.email);

    await user.client.post("/api/auth/sign-out");
    expect((await user.client.get("/api/auth/get-session")).body).toBeNull();
  });

  test("wrong password is rejected", async () => {
    const user = await signUp("Ben");
    const res = await new Client().post("/api/auth/sign-in/email", { email: user.email, password: "wrong-password" });
    expect(res.status).toBe(401);
  });

  test("password reset by email link", async () => {
    const user = await signUp("Carla");
    const request = await new Client().post("/api/auth/request-password-reset", {
      email: user.email,
      redirectTo: "/reset",
    });
    expect(request.status).toBe(200);

    const link = lastMailLink(user.email, "reset-password");
    expect(link).toBeTruthy();
    const token = new URL(link!).pathname.split("/").at(-1);
    const reset = await new Client().post("/api/auth/reset-password", { token, newPassword: "new-password-1" });
    expect(reset.status).toBe(200);

    const oldLogin = await new Client().post("/api/auth/sign-in/email", { email: user.email, password: PASSWORD });
    expect(oldLogin.status).toBe(401);
    const newLogin = await new Client().post("/api/auth/sign-in/email", { email: user.email, password: "new-password-1" });
    expect(newLogin.status).toBe(200);
  });
});

describe("plan access", () => {
  test("without session: 401", async () => {
    const owner = await signUp("Owner");
    const planId = await createPlan(owner);
    const res = await new Client().get(`/api/plans/${planId}`);
    expect(res.status).toBe(401);
    expect(res.body.data.code).toBe("UNAUTHORIZED");
  });

  test("not a member: 404 (does not reveal the plan exists)", async () => {
    const owner = await signUp("Owner");
    const stranger = await signUp("Stranger");
    const planId = await createPlan(owner);
    expect((await stranger.client.get(`/api/plans/${planId}`)).status).toBe(404);
    expect((await stranger.client.get(`/api/plans/${planId}/groups`)).status).toBe(404);
  });

  test("owner is admin", async () => {
    const owner = await signUp("Owner");
    const planId = await createPlan(owner, "Pfingstlager");
    const res = await owner.client.get(`/api/plans/${planId}`);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ name: "Pfingstlager", myRole: "admin", nextRotationAt: null });
    expect(res.body.settings).toMatchObject({ timezone: "Europe/Zurich", idlePolicy: "slots", visibility: "private" });
  });

  test("viewer can read but not write", async () => {
    const owner = await signUp("Owner");
    const viewer = await signUp("Viewer");
    const { planId, jobIds, groupIds } = await seedPlan(owner);
    await addToPlan(planId, viewer, "member");

    expect((await viewer.client.get(`/api/plans/${planId}`)).body.myRole).toBe("viewer");
    expect((await viewer.client.get(`/api/plans/${planId}/groups`)).status).toBe(200);
    expect((await viewer.client.get(`/api/plans/${planId}/rotations`)).status).toBe(200);

    const writes = [
      viewer.client.post(`/api/plans/${planId}/groups`, { name: "X", members: ["Y"] }),
      viewer.client.patch(`/api/plans/${planId}/jobs/${jobIds[0]}`, { name: "Z" }),
      viewer.client.put(`/api/plans/${planId}/assignments/${jobIds[0]}`, { groupId: groupIds[1] }),
      viewer.client.post(`/api/plans/${planId}/rotations`),
      viewer.client.patch(`/api/plans/${planId}/settings`, { rotationEnabled: true }),
    ];
    for (const res of await Promise.all(writes)) {
      expect(res.status).toBe(403);
      expect(res.body.data.code).toBe("FORBIDDEN");
    }
  });

  test("ids from another plan are not found", async () => {
    const owner = await signUp("Owner");
    const a = await seedPlan(owner);
    const b = await seedPlan(owner);
    const res = await owner.client.patch(`/api/plans/${b.planId}/groups/${a.groupIds[0]}`, { name: "Hijack" });
    expect(res.status).toBe(404);
    const put = await owner.client.put(`/api/plans/${b.planId}/assignments/${b.jobIds[0]}`, { groupId: a.groupIds[0] });
    expect(put.status).toBe(404);
  });

  test("last owner cannot leave the plan", async () => {
    const owner = await signUp("Owner");
    const planId = await createPlan(owner);
    const res = await owner.client.post("/api/auth/organization/leave", { organizationId: planId });
    expect(res.status).toBe(400);
  });
});

describe("member login", () => {
  test("disabled by default", async () => {
    const owner = await signUp("Owner");
    const { planId, groupIds } = await seedPlan(owner, { groups: 1, jobs: 1 });
    const group = (await owner.client.get(`/api/plans/${planId}/groups`)).body[0];
    const res = await owner.client.post(
      `/api/plans/${planId}/groups/${groupIds[0]}/members/${group.members[0].id}/invite`,
      { email: "kid@example.test" },
    );
    expect(res.status).toBe(403);
    expect(res.body.data.code).toBe("MEMBER_LOGIN_DISABLED");
  });

  test("invite, accept, and see my Ämtli", async () => {
    const owner = await signUp("Owner");
    await verifyEmail(owner);
    const { planId, groupIds, jobIds } = await seedPlan(owner, { groups: 2, jobs: 2 });
    await owner.client.patch(`/api/plans/${planId}/settings`, { memberLogin: true });
    const group = (await owner.client.get(`/api/plans/${planId}/groups`)).body.find(
      (g: { id: number }) => g.id === groupIds[1],
    );

    const kid = await signUp("Kid");
    await verifyEmail(kid);
    const invite = await owner.client.post(
      `/api/plans/${planId}/groups/${groupIds[1]}/members/${group.members[0].id}/invite`,
      { email: kid.email },
    );
    expect(invite.status, JSON.stringify(invite.body)).toBe(201);

    const accept = await kid.client.post("/api/auth/organization/accept-invitation", {
      invitationId: invite.body.invitationId,
    });
    expect(accept.status, JSON.stringify(accept.body)).toBe(200);

    const me = await kid.client.get(`/api/plans/${planId}/me`);
    expect(me.status).toBe(200);
    expect(me.body).toMatchObject({ role: "viewer", member: { name: group.members[0].name } });
    expect(me.body.jobs.map((job: { id: number }) => job.id)).toEqual([jobIds[1]]);
    expect(await prisma.member.count({ where: { userId: kid.id } })).toBe(1);
  });
});

describe("MiData", () => {
  test("not configured in tests: 503", async () => {
    const user = await signUp("Leiter");
    const res = await user.client.get("/api/midata/camps");
    expect(res.status).toBe(503);
    expect(res.body.data.code).toBe("MIDATA_NOT_CONFIGURED");
  });
});
