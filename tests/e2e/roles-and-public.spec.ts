import { expect, request as playwrightRequest, test } from "@playwright/test";
import { addMembership, loginUi, seedPlanApi, signUpApi } from "./helpers";

test("viewer can look but not change anything", async ({ page }) => {
  const request = page.request;
  const admin = await signUpApi(request, "Admin");
  const { planId } = await seedPlanApi(request, ["Wölfe", "Füchse"], ["Küche", "WC"]);

  // A second user, added as viewer
  const viewerContext = await playwrightRequest.newContext({ baseURL: "http://localhost:3999" });
  const viewer = await signUpApi(viewerContext, "Leser");
  await viewerContext.dispose();
  await addMembership(planId, viewer.id, "member");
  expect(admin.id).not.toBe(viewer.id);

  await page.context().clearCookies();
  await loginUi(page, viewer.email);
  await expect(page).toHaveURL(/\/plans$/);
  await page.goto(`/plans/${planId}`);
  await expect(page.getByText("Leser").first()).toBeVisible();
  await expect(page.getByTestId("rotate-now")).toHaveCount(0);

  await page.goto(`/plans/${planId}/jobs`);
  await expect(page.getByTestId("job-list")).toContainText("Küche");
  await expect(page.getByTestId("add-job")).toHaveCount(0);

  await page.goto(`/plans/${planId}/planner`);
  await expect(page.getByText("Du hast Lesezugriff.")).toBeVisible();

  await page.goto(`/plans/${planId}/settings`);
  await expect(page.getByText("Nur Admins können die Einstellungen ändern.")).toBeVisible();
  await expect(page.getByTestId("main-nav")).not.toContainText("Einstellungen");
});

test("public wall page updates by itself after a rotation", async ({ page, browser }) => {
  const request = page.request;
  await signUpApi(request, "Wand");
  const { planId } = await seedPlanApi(request, ["Wölfe", "Füchse"], ["Küche", "WC"]);

  await page.goto(`/plans/${planId}/settings/public`);
  await page.getByTestId("public-switch").click();
  const publicUrl = await page.getByTestId("public-url").inputValue();
  expect(publicUrl).toMatch(/\/p\/[\w-]+$/);

  // The wall screen: a separate, signed-out browser
  const wallContext = await browser.newContext({ locale: "de-CH" });
  const wall = await wallContext.newPage();
  await wall.goto(new URL(publicUrl).pathname);
  await expect(wall.getByTestId("wall-status")).toHaveText("Live");
  const cards = wall.getByTestId("wall-card");
  await expect(cards.first()).toContainText("Küche");
  await expect(cards.first()).toContainText("Wölfe");
  await expect(wall.getByText("Wölfe Person")).toHaveCount(0); // names hidden by default

  // Rotate in the admin tab; the wall follows without reload
  await page.goto(`/plans/${planId}`);
  await page.getByTestId("rotate-now").click();
  await expect(cards.first()).toContainText("Füchse", { timeout: 10_000 });

  await wallContext.close();
});

test("private plans are not visible on the wall URL", async ({ page }) => {
  const request = page.request;
  await signUpApi(request, "Privat");
  const { planId } = await seedPlanApi(request, ["Wölfe"], ["Küche"]);
  await page.goto(`/plans/${planId}/settings/public`);
  await page.getByTestId("public-switch").click();
  const publicUrl = await page.getByTestId("public-url").inputValue();
  await page.getByTestId("public-switch").click(); // back to private
  await expect(page.getByTestId("public-url")).toHaveCount(0);

  const response = await page.goto(new URL(publicUrl).pathname);
  expect(response?.status()).toBe(404);
});
