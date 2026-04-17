const assert = require("assert");

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

describe("Example Tests", function () {
  
  // Dynamic tests
  testsData.forEach(({ id, name, result }) => {
    it(`${name} @C${id}`, function () {
      assert.strictEqual(result, true);
    });
  });

  // Standalone test
  it("EX test titled", function () {
    assert.strictEqual(true, true);
  });

});