import { describe, test, expect } from "vitest";

const testsData = [
  { id: 17, name: "EX test title 1", result: true },
  { id: 18, name: "EX test title 2", result: true },
  { id: 19, name: "EX test title 3", result: true },
  { id: 22, name: "EX test title 4", result: false },
  { id: 7, name: "EX test title 5", result: false },
  { id: 4, name: "EX test title 6", result: false },
  { id: 23, name: "EX test title 7", result: true, status: "skip" },
  { id: 31, name: "EX test title 8", result: true, status: "skip" },
];
describe("Example Tests", () => {
  testsData.forEach((data) => {
    test.skipIf(data.status)(`${data.name} @C${data.id}`, () => {
      expect.soft(data.result).toBe(true);
    });
  });
});
