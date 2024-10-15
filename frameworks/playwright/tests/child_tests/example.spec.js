import { test, expect } from "@playwright/test";

const testsData = [
  { id: 9, name: "EX test title 1", result: [true, true] },
  { id: 10, name: "EX test title 2", result: [true, true] },
  { id: 21, name: "EX test title 3", result: true },
  { id: 24, name: "EX test title 4", result: false },
  { id: 25, name: "EX test title 5", result: false },
  { id: 26, name: "EX test title 6", result: false },
  { id: 29, name: "EX test title 7", result: true, status: "skip" },
  { id: 30, name: "EX test title 8", result: true, status: "skip" },
];
test.describe("Example Tests", function () {
  testsData.forEach((data) => {
    test(`${data.name} @C${data.id}`, async () => {
      if (!data.result) {
        test.fail();
        expect(data.result).toBe(true);
      } else {
        if (data.status) {
          test.skip();
        }
        if (data.result.length) {
          data.result.forEach((step, index) => {
            test.step(`Step ${index++}`, () => {
              expect(step).toBe(true);
            });
          });
        } else {
          expect(data.result).toBe(true);
        }
      }
    });
  });

  test.afterEach(async ({ page }) => {
    await page.waitForTimeout(300);
  });
});
