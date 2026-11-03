import { expect, test } from "@playwright/test";
import { seedPlanApi, signUpApi } from "./helpers";

const ORIGIN = { origin: "http://localhost:3999" };

test("design the wall and see it on the public page", async ({ page, browser }) => {
  const request = page.request;
  await signUpApi(request, "Designerin");
  const { planId, jobIds } = await seedPlanApi(request, ["Wölfe", "Füchse"], ["Küche", "Holz"]);
  await request.patch(`/api/plans/${planId}/settings`, { data: { visibility: "public" }, headers: ORIGIN });
  const kitchen = `job:${jobIds[0]}`;

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`/plans/${planId}/wall`);
  await expect(page.getByTestId("layout-source")).toHaveText("Automatisch");

  // Select "Küche" and move it 10 % right with the keyboard (Shift = 5 %).
  await page.getByTestId("element-list").getByRole("button", { name: "Küche", exact: true }).click();
  const x = page.getByTestId("input-x");
  const startX = Number((await x.inputValue()).replace(",", "."));
  await page.getByTestId("wall-canvas").focus();
  await page.keyboard.press("Shift+ArrowRight");
  await page.keyboard.press("Shift+ArrowRight");
  await expect.poll(async () => Number((await x.inputValue()).replace(",", "."))).toBeCloseTo(startX + 10, 1);
  await expect(page.getByTestId("layout-source")).toHaveText("Eigenes Layout");

  // Night cards, dotted background, QR code widget
  await page.getByRole("tab", { name: "Karten" }).click();
  await page.locator('[data-preset="night"]').click();
  await page.getByRole("tab", { name: "Hintergrund" }).click();
  await page.getByTestId("bg-kind").getByText("Muster").click();
  await page.getByRole("tab", { name: "Widgets" }).click();
  await page.getByTestId("widget-toggle-qr").click();
  await expect(page.locator('[data-key="widget:qr"]')).toBeVisible();

  // Undo + redo the QR toggle
  await page.keyboard.press("ControlOrMeta+z");
  await expect(page.locator('[data-key="widget:qr"]')).toHaveCount(0);
  await page.keyboard.press("ControlOrMeta+Shift+z");
  await expect(page.locator('[data-key="widget:qr"]')).toBeVisible();

  // Other sizes inherit until edited
  await page.getByTestId("size-tabs").getByRole("tab", { name: "TV / Beamer" }).click();
  await expect(page.getByTestId("layout-source")).toHaveText("Übernommen von Computer");

  await page.getByTestId("designer-save").click();
  await expect(page.getByText("Design gespeichert.", { exact: true })).toBeVisible();
  await expect(page.getByTestId("designer-save")).toBeDisabled();

  // Public wall on a desktop-sized screen
  const slug = (await (await request.get(`/api/plans/${planId}`)).json()).settings.publicSlug;
  const wallContext = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "de-CH" });
  const wall = await wallContext.newPage();
  await wall.goto(`/p/${slug}`);
  await expect(wall.getByTestId("wall-canvas")).toHaveAttribute("data-size", "desktop");
  const style = await wall.locator(`[data-key="${kitchen}"]`).getAttribute("style");
  expect(Number(/left: ([\d.]+)%/.exec(style ?? "")?.[1])).toBeCloseTo(startX + 10, 1);
  await expect(wall.getByTestId("wall-widget-qr").locator("svg")).toBeVisible();
  await expect(wall.getByTestId("wall-background")).toHaveAttribute("data-kind", "pattern");

  // A phone gets the phone layout (here: inherited from desktop, so same position in %)
  await wall.setViewportSize({ width: 390, height: 844 });
  await expect(wall.getByTestId("wall-canvas")).toHaveAttribute("data-size", "phone");
  await wallContext.close();
});

test("unsaved changes ask before leaving", async ({ page }) => {
  const request = page.request;
  await signUpApi(request, "Vergesslich");
  const { planId } = await seedPlanApi(request, ["Wölfe"], ["Küche"]);
  await page.goto(`/plans/${planId}/wall`);
  await page.getByRole("tab", { name: "Karten" }).click();
  await page.locator('[data-preset="bold"]').click();

  let asked = false;
  page.once("dialog", async (dialog) => {
    asked = true;
    await dialog.dismiss(); // stay
  });
  await page.getByTestId("main-nav").getByText("Ämtli", { exact: true }).click();
  await expect.poll(() => asked).toBe(true);
  await expect(page).toHaveURL(/\/wall$/);
});

test("dark/light switch", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/login");
  const html = page.locator("html");
  await expect(html).not.toHaveClass(/dark/);
  await page.getByTestId("color-mode").click();
  await expect(html).toHaveClass(/dark/);
  await page.reload();
  await expect(html).toHaveClass(/dark/); // remembered
  await page.getByTestId("color-mode").click();
  await expect(html).not.toHaveClass(/dark/);
});
