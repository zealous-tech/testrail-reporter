import { describe, test, expect } from "vitest";

const testsData = [
  { id: 1, name: "EX test title 1", result: true },
  { id: 2, name: "EX test title 2", result: true },
  { id: 3, name: "EX test title 3", result: true },
  { id: 4, name: "EX test title 4", result: false },
  { id: 5, name: "EX test title 5", result: false },
  { id: 6, name: "EX test title 6", result: false },
  { id: 7, name: "EX test title 7", result: true },
];
describe("Example Tests", () => {
  testsData.forEach((data) => {
    test.skipIf(data.status)(`${data.name} @C${data.id}`, () => {
      expect.soft(data.result).toBe(true);
    });
  });

  test('One test cover multiple in testRail @C8 @C9 @C10 @C11 @C12 @C13 @C14', async () => 
  {
    expect.soft(true).toEqual(true)
  })
});
