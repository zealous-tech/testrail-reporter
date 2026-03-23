const testsData = [
  { id: 1, name: "EX test title 2", result: true },
  { id: 2, name: "EX test title 3", result: true },
  { id: 3, name: "EX test title 4", result: false },
  { id: 7, name: "EX test title 5", result: false },
  { id: 4, name: "EX test title 6", result: false },
  { id: 5, name: "EX test title 7", result: true },
  { id: 6, name: "EX test title 8", result: true },
  { id: 7, name: "EX test title 7", result: false,  },
];

describe("Example Tests", () => {
  test.each(testsData)("$name @C$id", ({ result }) => {
    // throw new Error("This is a test error");
    expect(result).toBe(true);
  });

});

