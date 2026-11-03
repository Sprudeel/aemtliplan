import { expect, test } from "@playwright/test";
import { ringGroups, seedPlanApi, signUpApi } from "./helpers";

test("admin sets up a plan from scratch", async ({ page }) => {
  const request = page.request;
  await signUpApi(request, "Leiterin");

  // Create plan
  await page.goto("/plans");
  await page.getByTestId("create-plan").click();
  await page.getByLabel("Name des Plans").fill("Pfingstlager");
  await page.getByRole("button", { name: "Erstellen" }).click();
  await expect(page).toHaveURL(/\/plans\/[\w-]+$/);
  const planUrl = page.url();

  // Two Ämtli
  await page.goto(`${planUrl}/jobs`);
  for (const [name, emoji] of [["Küche", "🍽️"], ["Holz", "🪵"]]) {
    await page.getByTestId("add-job").click();
    await page.getByTestId("job-form").getByLabel("Name").fill(name!);
    await page.getByRole("button", { name: emoji }).click();
    await page.getByRole("button", { name: "Speichern" }).click();
    await expect(page.getByTestId("job-list").getByText(name!, { exact: true })).toBeVisible();
  }
  await expect(page.getByTestId("job-list").locator("li")).toHaveCount(2);

  // Two groups (members via tag input)
  await page.goto(`${planUrl}/groups`);
  for (const [name, members] of [["Wölfe", ["Gecko", "Luchs"]], ["Füchse", ["Pingu"]]] as const) {
    await page.getByTestId("add-group").click();
    await page.getByTestId("group-form").getByLabel("Name").fill(name);
    const tags = page.getByPlaceholder("Name eingeben, Enter drücken");
    for (const member of members) {
      await tags.fill(member);
      await tags.press("Enter");
    }
    await page.getByRole("button", { name: "Speichern" }).click();
    // Wait for this group in the list (a toast from the previous group may still be visible).
    await expect(page.getByTestId("group-list").getByText(name, { exact: true })).toBeVisible();
  }

  // New groups in rotation take the free Ämtli automatically
  await page.goto(`${planUrl}/planner`);
  await expect.poll(() => ringGroups(page)).toEqual(["Wölfe", "Füchse"]);

  // Same person in two groups is refused
  await page.goto(`${planUrl}/groups`);
  await page.getByTestId("add-group").click();
  await page.getByTestId("group-form").getByLabel("Name").fill("Dachse");
  const tags = page.getByPlaceholder("Name eingeben, Enter drücken");
  await tags.fill("gecko");
  await tags.press("Enter");
  await page.getByRole("button", { name: "Speichern" }).click();
  await expect(page.getByText("Schon in einer anderen Gruppe: Gecko", { exact: true })).toBeVisible();
});

test("planner: drag a group onto an Ämtli, reorder, rotate and undo", async ({ page }) => {
  const request = page.request;
  await signUpApi(request, "Planerin");
  const { planId } = await seedPlanApi(request, ["Wölfe", "Füchse", "Dachse"], ["Küche", "WC", "Holz"]);
  await page.goto(`/plans/${planId}/planner`);
  await expect.poll(() => ringGroups(page)).toEqual(["Wölfe", "Füchse", "Dachse"]);

  // Drag "Dachse" from the pool onto "Küche"
  const pool = page.getByTestId("group-pool");
  const target = page.locator('[data-testid="ring"] .ring-item').first().locator('[data-testid^="drop-"]');
  await pool.locator(".pool-item", { hasText: "Dachse" }).dragTo(target);
  await expect.poll(() => ringGroups(page)).toEqual(["Dachse", "Füchse", "Dachse"]);

  // Reorder: move "Holz" up one place
  const holz = page.locator(".ring-item", { hasText: "Holz" });
  await holz.getByRole("button", { name: "Nach oben" }).click();
  await expect(page.getByText("Reihenfolge gespeichert.", { exact: true })).toBeVisible();
  await expect(page.locator(".ring-item").nth(1)).toContainText("Holz");

  // Rotate from the dashboard, check the preview moved, then undo
  await page.goto(`/plans/${planId}`);
  const preview = page.getByTestId("rotation-preview");
  const before = (await preview.textContent()) ?? "";
  await page.getByTestId("rotate-now").click();
  await expect(page.getByText("Rotation durchgeführt.", { exact: true })).toBeVisible();
  await expect.poll(() => preview.textContent()).not.toBe(before);

  await page.getByTestId("undo-last").click();
  await expect(page.getByText("Rotation rückgängig gemacht.", { exact: true })).toBeVisible();
  await expect.poll(() => preview.textContent()).toBe(before);

  // History shows both entries; the undo cannot be undone
  await page.goto(`/plans/${planId}/history`);
  await expect(page.getByTestId("history-list").locator("> li")).toHaveCount(2);
  await expect(page.getByTestId("undo-rotation")).toHaveCount(0);
});

test("schedule: switching on shows the next run on the dashboard", async ({ page }) => {
  const request = page.request;
  await signUpApi(request, "Zeitplan");
  const { planId } = await seedPlanApi(request, ["Wölfe"], ["Küche"]);
  await page.goto(`/plans/${planId}/settings`);
  await page.getByTestId("auto-rotation").click();
  await page.getByTestId("rotation-time").fill("07:30");
  await page.getByTestId("schedule-form").getByRole("button", { name: "Speichern" }).click();
  await expect(page.getByText("Gespeichert.", { exact: true })).toBeVisible();
  await expect(page.getByText(/Nächste Rotation: .*07:30/)).toBeVisible();

  await page.goto(`/plans/${planId}`);
  await expect(page.getByTestId("next-rotation")).toContainText("07:30");
});
