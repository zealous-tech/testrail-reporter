const { test, expect } = require("@playwright/test");
import it from "@playwright/test";
import { setTimeout } from "timers/promises";

// test.afterEach(async ({ page }) => {
//   await page.waitForTimeout(300);
// });

test.describe.only("Existing test cases in suite", function () {
    it("@C402 verify 142 + 142", async ({ page }) => {
        await test.step("C402 Step 1", async () => {
            console.log("C402 Step 1");
            // await setTimeout(5000);
            expect(10 + 10).toEqual(20);
        });
        await test.step("C402 Step 2", async () => {
            console.log("C402 Step 2");
            // await setTimeout(5000);
            expect(20 + 30).toEqual(50);
        });
        // await setTimeout(5000);
        // expect(142 + 142).toEqual(284);
    });

    it("@C403 Verify 144 + 144", async ({ page }) => {
        // await setTimeout(5000);
        await test.step("C403 Step 1", async () => {
            console.log("Step 1");
            expect(50 + 50).toEqual(100);
        });
    });
});

test.describe("Non existing test cases in suite", function () {
    test("@C1 has title", async ({ page }) => {
        await page.goto("https://playwright.dev/");
        await expect(page).toHaveTitle(/Playwright/);
    });

    test("@C2 get started link", async ({ page }) => {
        await page.goto("https://playwright.dev/");
        await page.getByRole("link", { name: "Get started" }).click();
        await expect(
            page.getByRole("heading", { name: "Installation" }),
        ).toBeVisible();
    });
});
