const { test, expect } = require("@playwright/test");
import it from "@playwright/test";
import { setTimeout } from "timers/promises";
const dummyTimeout = 700;

// test.afterEach(async ({ page }) => {
//   await page.waitForTimeout(300);
// });

test.describe("Existing test cases in suite", function() {
    it("with no case id: 1111111111111", async ({ page }) => {
        await test.step("Step 1", async () => {
            // console.log("C256 Step 1");
            await setTimeout(dummyTimeout);
            expect(1 + 1).toEqual(2);
        });
        await test.step("Step 2", async () => {
            // console.log("C256 Step 2");
            await setTimeout(dummyTimeout);
            expect(2 + 3).toEqual(5);
        });
    });

    it("with no case id: 222222222222", async ({ page }) => {
        await test.step("Step 1", async () => {
            // console.log("C256 Step 1");
            await setTimeout(dummyTimeout);
            expect(1 + 1).toEqual(2);
        });
        await test.step("Step 2", async () => {
            // console.log("C256 Step 2");
            await setTimeout(dummyTimeout);
            expect(2 + 3).toEqual(5);
        });
    });


    it("with no case id: 3333333333", async ({ page }) => {
        await test.step("Step 1", async () => {
            // console.log("C256 Step 1");
            await setTimeout(dummyTimeout);
            expect(1 + 1).toEqual(2);
        });
        await test.step("Step 2", async () => {
            // console.log("C256 Step 2");
            await setTimeout(dummyTimeout);
            expect(2 + 3).toEqual(5);
        });
    });


    it("@C4 444444444", async ({ page }) => {
        await test.step("Step 1", async () => {
            // console.log("C256 Step 1");
            await setTimeout(dummyTimeout);
            expect(1 + 1).toEqual(2);
        });
        await test.step("Step 2", async () => {
            // console.log("C256 Step 2");
            await setTimeout(dummyTimeout);
            expect(2 + 3).toEqual(5);
        });
    });


    it("@C5 555555555", async ({ page }) => {
        await test.step("Step 1", async () => {
            // console.log("C256 Step 1");
            await setTimeout(dummyTimeout);
            expect(1 + 1).toEqual(2);
        });
        await test.step("Step 2", async () => {
            // console.log("C256 Step 2");
            await setTimeout(dummyTimeout);
            expect(2 + 3).toEqual(5);
        });
    });


    it("@C6 666666666", async ({ page }) => {
        await test.step("Step 1", async () => {
            // console.log("C256 Step 1");
            await setTimeout(dummyTimeout);
            expect(1 + 1).toEqual(2);
        });
        await test.step("Step 2", async () => {
            // console.log("C256 Step 2");
            await setTimeout(dummyTimeout);
            expect(2 + 3).toEqual(5);
        });
    });


    it("@C7 777777777", async ({ page }) => {
        await test.step("Step 1", async () => {
            // console.log("C256 Step 1");
            await setTimeout(dummyTimeout);
            expect(1 + 1).toEqual(2);
        });
        await test.step("Step 2", async () => {
            // console.log("C256 Step 2");
            await setTimeout(dummyTimeout);
            expect(2 + 3).toEqual(5);
        });
    });


    it("@C8 888888888", async ({ page }) => {
        await test.step("Step 1", async () => {
            // console.log("C256 Step 1");
            await setTimeout(dummyTimeout);
            expect(1 + 1).toEqual(2);
        });
        await test.step("Step 2", async () => {
            // console.log("C256 Step 2");
            await setTimeout(dummyTimeout);
            expect(2 + 3).toEqual(5);
        });
    });


    it("@C9 999999999", async ({ page }) => {
        await test.step("Step 1", async () => {
            // console.log("C256 Step 1");
            await setTimeout(dummyTimeout);
            expect(1 + 1).toEqual(2);
        });
        await test.step("Step 2", async () => {
            // console.log("C256 Step 2");
            await setTimeout(dummyTimeout);
            expect(2 + 3).toEqual(5);
        });
    });


    it("@C10 000000000", async ({ page }) => {
        await test.step("Step 1", async () => {
            // console.log("C256 Step 1");
            await setTimeout(dummyTimeout);
            expect(1 + 1).toEqual(2);
        });
        await test.step("Step 2", async () => {
            // console.log("C256 Step 2");
            await setTimeout(dummyTimeout);
            expect(2 + 3).toEqual(5);
        });
    });


    it("@C256 verify 1 + 1", async ({ page }) => {
        await test.step("Step 1", async () => {
            await setTimeout(dummyTimeout);
            expect(1 + 1).toEqual(2);
        });
        await test.step("Step 2", async () => {
            await setTimeout(dummyTimeout);
            expect(2 + 3).toEqual(5);
        });
    });

    it("@C277 Verify 2 + 2 [known issue]", async ({ page }) => {
        await test.step("C403 Step 1", async () => {
            await setTimeout(dummyTimeout);
            expect(50 + 50).toEqual(500);
        });
    });

    it("@C278 Verify 3 + 3", async ({ page }) => {
        await setTimeout(dummyTimeout);
        expect(1 + 2).toEqual(3);
    });

    it("@C279 Verify 4 + 4", async ({ page }) => {
        await setTimeout(dummyTimeout);
        expect(1 + 2).toEqual(3);
    });

    it("@C280 Verify 5 + 5", async ({ page }) => {
        await setTimeout(dummyTimeout);
        expect(1 + 2).toEqual(3);
    });

    it("@C281 Verify 6 + 6", async ({ page }) => {
        await setTimeout(dummyTimeout);
        expect(1 + 2).toEqual(3);
    });

    it("@C282 Verify 7 + 7", async ({ page }) => {
        await setTimeout(dummyTimeout);
        expect(1 + 2).toEqual(3);
    });

    it("@C283 Verify 8 + 8", async ({ page }) => {
        await setTimeout(dummyTimeout);
        expect(1 + 2).toEqual(3);
    });

    it("@C284 Verify 9 + 9", async ({ page }) => {
        await setTimeout(dummyTimeout);
        expect(1 + 2).toEqual(3);
    });

    it("@C285 Verify 10 + 10", async ({ page }) => {
        await setTimeout(dummyTimeout);
        expect(1 + 2).toEqual(3);
    });

    it("@C286 Verify 11 + 11", async ({ page }) => {
        await setTimeout(dummyTimeout);
        expect(1 + 2).toEqual(3);
    });

    it("@C287 Verify 12 + 12", async ({ page }) => {
        await setTimeout(dummyTimeout);
        expect(1 + 2).toEqual(3);
    });

});

test.describe("Non existing test cases in suite", function() {
    test("has title", async ({ page }) => {
        await page.goto("https://playwright.dev/");
        await expect(page).toHaveTitle(/Playwright/);
    });

    test("get started link", async ({ page }) => {
        await page.goto("https://playwright.dev/");
        await page.getByRole("link", { name: "Get started" }).click();
        await expect(
            page.getByRole("heading", { name: "Installation" }),
        ).toBeVisible();
    });
});
