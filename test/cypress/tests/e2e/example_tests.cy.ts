export {};

const testsData = [
  { id: 1, name: "EX test title 2", result: true },
  { id: 2, name: "EX test title 3", result: true },
  { id: 3, name: "EX test title 4", result: true },
  { id: 8, name: "EX test title 5", result: true },
  { id: 4, name: "EX test title 6", result: true },
  { id: 5, name: "EX test title 7", result: true },
  { id: 6, name: "EX test title 8", result: true },
  { id: 7, name: "EX test title 7", result: false },
];

describe("Example Tests", () => {
  // 1. Dynamic tests from testsData
  testsData.forEach(({ id, name, result }) => {
    it(`${name} @C${id}`, () => {
      expect(result).to.equal(true);
    });
  });

  // 2. Single standalone test
  it("EX test titled", () => {
    expect(true).to.equal(true);
  });
});