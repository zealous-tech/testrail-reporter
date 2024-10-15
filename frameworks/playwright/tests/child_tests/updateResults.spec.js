import { test, expect } from "@playwright/test";
import config from "../../testrail.config.js";
import { delay } from "../../../utils.js";
import { TestRailFunc } from "../../../testRailFunc.js";
const testsData = [
  { id: 9, name: "EX test title 1" },
  { id: 10, name: "EX test title 2" },
  { id: 21, name: "EX test title 3" },
  { id: 24, name: "EX test title 4" },
  { id: 25, name: "EX test title 5" },
  { id: 26, name: "EX test title 6" },
];

test.describe("Update Result Scenarios", function () {
  let trFunc;
  let getRunsBeforeNewRun;
  let newRun;
  test.beforeAll(async () => {
    trFunc = new TestRailFunc(config);
    getRunsBeforeNewRun = await trFunc.getRuns();
    newRun = getRunsBeforeNewRun[getRunsBeforeNewRun.length - 1];
  });

  test.describe("Update Result After Each Cases @AfterEach", function () {
    testsData.forEach((data, index) => {
      test(`${data.name} @C${data.id}`, async () => {
        if (index === 0) {
          expect(1 + 1).toEqual(2);
        } else {
          const myRun = await trFunc.getRun(newRun.id);
          let runsTests = myRun.tests;
          let lastTest = runsTests.find(
            (obj) => obj.case_id === testsData[index - 1].id
          );
          expect(lastTest.results).toBeTruthy();
          expect(lastTest.results[0].title).toBe(
            `${testsData[index - 1].name} @C${testsData[index - 1].id}`
          );
        }
      });
    });
  });

  test.describe("Update Result After All Cases @AfterAll", function () {
    testsData.forEach((data, index) => {
      test(`${data.name} @C${data.id}`, async () => {
        if (index === 0) {
          expect(1 + 1).toEqual(2);
        } else {
          const myRun = await trFunc.getRun(newRun.id);
          let runsTests = myRun.tests;
          let lastTest = runsTests.find(
            (obj) => obj.case_id === testsData[index - 1].id
          );
          expect(lastTest.results).not.toBeTruthy();
        }
      });
    });
  });

  test.describe("Update Result with Interval @Interval", function () {
    let getInterval;
    test.beforeAll(async () => {
      getInterval = process.env.INTERVAL;
    });
    
    testsData.forEach((data, index) => {
      test(`${data.name} @C${data.id}`, async () => {
        test.slow();
        if (index === 0) {
          expect(1 + 1).toEqual(2);
        } else {
          await delay(getInterval);
          const myRun = await trFunc.getRun(newRun.id);
          let runsTests = myRun.tests;
          let lastTest = runsTests.find(
            (obj) => obj.case_id === testsData[index - 1].id
          );
          expect(lastTest.results).toBeTruthy();
        }
      });
    });
  });

  test.describe("Updating Existing Run @ExistingRun", function () {
    testsData.forEach((data) => {
      test(`${data.name} @C${data.id}`, async () => {
        expect(2 + 3).toEqual(5);
      });
    });
  });
});
