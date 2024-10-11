import { test, expect } from "@playwright/test";
import config from "../testrail.config.js";
import { execSync } from "child_process";
import { TestRailFunc } from "../../testRailFunc.js";
import {
  backupConfig,
  restoreConfig,
  modifyConfig,
  delay,
} from "../../utils.js";
import path from "path";
const configPath = path.join(__dirname, "../testrail.config.js");

test.describe("Creating New Run", function () {
  let trFunc;
  let getRunsBeforeNewRun;
  let getRunsAfterNewRun;
  let myRun;
  let runIDs = [];
  let runData;
  
  test.beforeAll(async () => {
    trFunc = new TestRailFunc(config);
    backupConfig(configPath);
    getRunsBeforeNewRun = await trFunc.getRuns();
    console.log("Start run example tests ...");
    execSync("npm run tests", { stdio: "inherit" });
    getRunsAfterNewRun = await trFunc.getRuns();
    myRun = getRunsAfterNewRun[getRunsAfterNewRun.length - 1];
    runData = await trFunc.getRun(myRun.id);
    runIDs.push(myRun.id);
  });

  test.afterAll(async () => {
    restoreConfig(configPath);
    trFunc = new TestRailFunc(config);
    let delRuns = await trFunc.deleteRun(runIDs);
    console.log("🚀 ~ test.afterAll ~ delRuns:", delRuns);
  });

  test("Verify that a new test run is created successfully when the conditions are met", async () => {
    expect(getRunsAfterNewRun.length).toBeGreaterThan(
      getRunsBeforeNewRun.length
    );
    expect(myRun).toMatchObject({ milestone_id: null, include_all: false });
  });

  test("Verify that an error message is added to the comment field of the TestRail test result when a test case fails", async () => {
    const failedTests = await runData.tests.filter(
      (test) => test.status_id === config.status.failed
    );
    const allHaveError = failedTests
      .map((test) => test.results)
      .every((res) => res[0].comment.includes("Error:"));
    expect(allHaveError).toBe(true);
  });

  test("Make sure that if the setting for screenshots/video is enabled in playwright.config, the generated screenshots will be available in the test attachments of the testrail run tests", async () => {
    const allHaveAttachments = await runData.tests
      .map((test) => test.results)
      .every((res) => {
        return res[0].attachments.length;
      });
    expect(allHaveAttachments).toBe(true);
  });

  test("Verify that if test case have steps after test run results of steps should be added", async () => {
    const tests = runData.tests;
    tests.forEach((test) => {
      if (test.custom_steps) {
        expect(test.results[0].custom_step_results.length).toBe(
          test.custom_steps
        );
      } else {
        expect(test.results[0].custom_step_results.length).not.toBeTruthy();
      }
    });
  });

  test("Make sure that when you configure statuses and set the skip flag in the test, the status should be visible in TestRail run", async () => {
    const skippedTests = await runData.tests.filter(
      (test) => test.status_id === config.status.skipped
    );
    expect(skippedTests.length).toBeTruthy();
    const allHaveSkipStatus = skippedTests
      .map((test) => test.results)
      .every((res) => res[0].status_id === config.status.skipped);
    expect(allHaveSkipStatus).toBe(true);
  });

  test("Verify that the run name consists of the following combination: <run_name> <current_date> in the test", async () => {
    const dateFormatRegex = new RegExp(
      `^${config.create_new_run.run_name} \\d{1,2}-[A-Za-z]{3}-\\d{4} \\d{2}:\\d{2}:\\d{2}$`
    );
    expect(myRun.name).toMatch(dateFormatRegex);
  });

  test("Verify that the reporter works with updated configurations when the default TestRail config is changed", async () => {
    let newData = {
      include_all: true,
      run_name: "Test Run Playwright",
      milestone_id: 2,
    };
    let changedConfig = {
      ...config,
      create_new_run: newData,
    };
    modifyConfig(configPath, changedConfig);
    execSync("npm run tests", { stdio: "inherit" });
    const runsLength = getRunsAfterNewRun.length;
    getRunsAfterNewRun = await trFunc.getRuns();
    expect(getRunsAfterNewRun.length).toBeGreaterThan(runsLength);
    const myNewRun = getRunsAfterNewRun[getRunsAfterNewRun.length - 1];
    runIDs.push(myNewRun.id);
    const dateFormatRegex = new RegExp(
      `^${newData.run_name} \\d{1,2}-[A-Za-z]{3}-\\d{4} \\d{2}:\\d{2}:\\d{2}$`
    );
    expect(myNewRun.name).toMatch(dateFormatRegex);
    delete newData.run_name;
    expect(myNewRun).toMatchObject(newData);
  });
});

test.describe("Update Results AfterEach/AfterAll Cases", function () {
  let trFunc;
  let getRunsBeforeNewRun;
  let runIDs = [];
  test.beforeAll(async () => {
    backupConfig(configPath);
    trFunc = new TestRailFunc(config);
  });

  test.afterAll(async () => {
    restoreConfig(configPath);
    trFunc = new TestRailFunc(config);
    let delRuns = await trFunc.deleteRun(runIDs);
    console.log("🚀 ~ test.afterAll ~ delRuns:", delRuns);
  });

  test("AfterEach / updateResultAfterEachCase is true", async () => {
    modifyConfig(configPath, { ...config, updateResultAfterEachCase: true });
    console.log("Start run AfterEach tests ...");
    execSync("npm run tests:AfterEach", { stdio: "inherit" });
    getRunsBeforeNewRun = await trFunc.getRuns();
    const myRun = await trFunc.getRun(
      getRunsBeforeNewRun[getRunsBeforeNewRun.length - 1].id
    );
    runIDs.push(myRun.id);
    let runsTests = myRun.tests;
    let finalTest = runsTests[runsTests.length - 1];
    expect(finalTest.results).toBeTruthy();
  });

  test("AftherAll / updateResultAfterEachCase is false", async () => {
    modifyConfig(configPath, { ...config, updateResultAfterEachCase: false });
    console.log("Start run AfterAll tests ...");
    execSync("npm run tests:AfterAll", { stdio: "inherit" });
    getRunsBeforeNewRun = await trFunc.getRuns();
    const myRun = await trFunc.getRun(
      getRunsBeforeNewRun[getRunsBeforeNewRun.length - 1].id
    );
    runIDs.push(myRun.id);
    let tests = myRun.tests;
    expect(tests.map((test) => test.results)).not.toContain(undefined);
  });
});

test.describe("Update Result with Interval", function () {
  let trFunc;
  let getRunsBeforeNewRun;
  let runIDs = [];
  test.beforeAll(async () => {
    backupConfig(configPath);
    trFunc = new TestRailFunc(config);
  });

  test.afterAll(async () => {
    restoreConfig(configPath);
    trFunc = new TestRailFunc(config);
    let delRuns = await trFunc.deleteRun(runIDs);
    console.log("🚀 ~ test.afterAll ~ delRuns:", delRuns);
  });

  test("Interval / testRailUpdateInterval is not equal to 0", async () => {
    test.slow();
    let testRunInterval = 3;
    modifyConfig(configPath, {
      ...config,
      testRailUpdateInterval: testRunInterval,
    });
    testRunInterval++;
    console.log("Start run AfterEach tests ...");
    execSync(`npm run tests:Interval --interval=${testRunInterval}`, {
      stdio: "inherit",
    });
    await delay(testRunInterval);
    getRunsBeforeNewRun = await trFunc.getRuns();
    const myRun = await trFunc.getRun(
      getRunsBeforeNewRun[getRunsBeforeNewRun.length - 1].id
    );
    runIDs.push(myRun.id);
    let runsTests = myRun.tests;
    let finalTest = runsTests[runsTests.length - 1];
    expect(finalTest.results).toBeTruthy();
  });
});

test.describe("Updating Existing Run", function () {
  let trFunc;
  let getRunsBeforeNewRun;
  let runIDs = [];
  test.beforeAll(async () => {
    backupConfig(configPath);
    trFunc = new TestRailFunc(config);
    execSync("npm run tests:ExistingRun", {
      stdio: "inherit",
    });
  });

  test.afterAll(async () => {
    restoreConfig(configPath);
    trFunc = new TestRailFunc(config);
    let delRuns = await trFunc.deleteRun(runIDs);
    console.log("🚀 ~ test.afterAll ~ delRuns:", delRuns);
  });

  test("Existing Run / Valid id in the use_existing_run", async () => {
    getRunsBeforeNewRun = await trFunc.getRuns();
    let myRun = await trFunc.getRun(
      getRunsBeforeNewRun[getRunsBeforeNewRun.length - 1].id
    );
    console.log("🚀 ~ test ~ myRun.id:", myRun.id);
    runIDs.push(myRun.id);
    modifyConfig(configPath, {
      ...config,
      use_existing_run: { id: myRun.id },
    });
    console.log("Start run ExistingRun tests ...");
    execSync("npm run tests:ExistingRun", {
      stdio: "inherit",
    });
    myRun = await trFunc.getRun(myRun.id);
    let tests = myRun.tests;
    const allHaveLengthTwo = tests.every((test) => test.results.length === 2);
    expect(allHaveLengthTwo).toBe(true);
  });
});
