import { expect, test } from "@playwright/test";
import { loginUi, PASSWORD, signUpApi } from "./helpers";

test("register, land on the empty plan list, sign out", async ({ page }) => {
  const email = `neu-${Date.now()}@example.test`;
  await page.goto("/register");
  await page.getByLabel("Name").fill("Gecko");
  await page.getByLabel("E-Mail").fill(email);
  await page.getByLabel("Passwort", { exact: true }).fill(PASSWORD);
  await page.getByLabel("Passwort bestätigen").fill(PASSWORD);
  await page.getByRole("button", { name: "Registrieren" }).click();

  await expect(page).toHaveURL(/\/plans$/);
  await expect(page.getByText("Noch keine Pläne")).toBeVisible();

  await page.getByTestId("user-menu").click();
  await page.getByRole("menuitem", { name: "Abmelden" }).click();
  await expect(page).toHaveURL(/\/login/);
});

test("form validation and wrong password", async ({ page }) => {
  const request = page.request;
  const user = await signUpApi(request, "Luchs");
  await page.context().clearCookies(); // sign-up signed us in
  await page.goto("/login");
  await page.getByLabel("E-Mail").fill("kein-mail");
  await page.getByRole("button", { name: "Anmelden" }).click();
  await expect(page.getByText("Gib eine gültige E-Mail-Adresse ein")).toBeVisible();

  await loginUi(page, user.email, "falsches-passwort");
  await expect(page.getByText("E-Mail oder Passwort ist falsch.", { exact: true })).toBeVisible();
  await expect(page).toHaveURL(/\/login/);

  await loginUi(page, user.email);
  await expect(page).toHaveURL(/\/plans$/);
});

test("protected pages redirect to login and back", async ({ page }) => {
  const request = page.request;
  const user = await signUpApi(request, "Fuchs");
  await page.context().clearCookies();
  await page.goto("/account");
  await expect(page).toHaveURL(/\/login\?redirect=(%2F|\/)account/);
  await loginUi(page, user.email, undefined, { navigate: false });
  await expect(page).toHaveURL(/\/account$/);
  await expect(page.getByRole("heading", { name: "Mein Konto" }).or(page.getByText("Mein Konto").first())).toBeVisible();
});

test("language switch on the login page (FR, IT) is remembered", async ({ page }) => {
  await page.goto("/login");
  await page.getByTestId("auth-locale").click();
  await page.getByRole("option", { name: "Français" }).click();
  await expect(page.getByRole("heading", { name: "Connexion" })).toBeVisible();

  await page.reload();
  await expect(page.getByRole("heading", { name: "Connexion" })).toBeVisible();

  await page.getByTestId("auth-locale").click();
  await page.getByRole("option", { name: "Italiano" }).click();
  await expect(page.getByRole("heading", { name: "Accedi" })).toBeVisible();
});
