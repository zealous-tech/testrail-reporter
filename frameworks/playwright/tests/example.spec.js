// @ts-check
const { test, expect } = require("@playwright/test");
import it from "@playwright/test";
import { setTimeout } from "timers/promises";

test.afterEach(async ({ page }) => {
  await page.waitForTimeout(300);
});

test.describe("Basic test cases", function () {
  test("@C1 has title", async ({ page }) => {
    await page.goto("https://playwright.dev/");

    // Expect a title "to contain" a substring.
    await expect(page).toHaveTitle(/Playwright/);
  });

  test("@C2 get started link", async ({ page }) => {
    await page.goto("https://playwright.dev/");

    // Click the get started link.
    await page.getByRole("link", { name: "Get started" }).click();

    // Expects page to have a heading with the name of Installation.
    await expect(
      page.getByRole("heading", { name: "Installation" }),
    ).toBeVisible();
  });

  it("@C402 verify 142 + 142", async ({ page }) => {
    console.log("Test case 402");
    await setTimeout(5000);
    expect(142 + 142).toEqual(284);
  });

  it("@C403 Verify 144 + 144", async ({ page }) => {
    console.log("Test case 403");
    await setTimeout(5000);
    expect(143 + 143).toEqual(286);
  });
});
