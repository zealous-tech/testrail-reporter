import { describe, beforeAll, afterAll, test, expect } from "vitest";
import config from "../testrail.config.js";
import { execSync, exec } from "child_process";
import { TestRailFunc } from "../../testRailFunc.js";
import {
  backupConfig,
  restoreConfig,
  modifyConfig,
  delay,
} from "../../utils.js";
import path from "path";
const configPath = path.join(__dirname, "../testrail.config.js");

describe("Creating New Run", async () => {
  let trFunc;
  let getRunsBeforeNewRun;
  let getRunsAfterNewRun;
  let myRun;
  let runIDs = [];
  let runData;

  beforeAll(async () => {
    trFunc = new TestRailFunc(config);
    backupConfig(configPath);
    getRunsBeforeNewRun = await trFunc.getRuns();
    console.info("Running child tests for NewRun test cases ...");
    execSync("npm run newRun || true", { stdio: "inherit" });
    getRunsAfterNewRun = await trFunc.getRuns();
    myRun = getRunsAfterNewRun[getRunsAfterNewRun.length - 1];
    runData = await trFunc.getRun(myRun.id);
    runIDs.push(myRun.id);
  });

  afterAll(async () => {
    restoreConfig(configPath);
    let delRuns = await trFunc.deleteRun(runIDs);
    console.info("🚀 ~ afterAll ~ delRuns:", delRuns);
  });

  test("Verify that a new test run is created successfully when the conditions are met", async () => {
    expect(getRunsAfterNewRun.length).toBeGreaterThan(
      getRunsBeforeNewRun.length
    );
    expect(myRun).toMatchObject({ milestone_id: null, include_all: false });
  });

  test("Verify that an error message is added to the comment field of the TestRail test result when a test case fails", async () => {
    const failedTests = await runData.tests
      .filter((test) => test.status_id === config.status.failed)
      .map((test) => test.results)
      .every((res) => res[0].comment.includes("Error message:"));
    expect(failedTests).toBe(true);
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

  test("Ensure that when you set include_all to false, the TestRail test run includes only those test cases that were included in the automated tests. ", async () => {
    const cases = await trFunc.getCases();
    expect(runData.tests.length).toBeLessThan(cases.length);
  });

  test("Verify that the reporter works with updated configurations when the default TestRail config is changed", async () => {
    const newData = {
      include_all: true,
      run_name: "Test Run Vitest",
      milestone_id: 2,
    };

    modifyConfig(configPath, {
      ...config,
      create_new_run: newData,
    });

    console.info("Running NewRun tests with updated configurations ...");
    execSync("npm run newRun || true", { stdio: "inherit" });

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

  test("Make sure that when include_all is true, tests that have not been tested are given the status untested", async () => {
    modifyConfig(configPath, {
      ...config,
      create_new_run: {
        include_all: true,
      },
    });
    console.info(
      "Running NewRun tests with include_all true configuration ..."
    );
    execSync("npm run newRun || true", { stdio: "inherit" });

    getRunsBeforeNewRun = await trFunc.getRuns();
    const untestedTests = await trFunc
      .getRun(getRunsBeforeNewRun[getRunsBeforeNewRun.length - 1].id)
      .then((run) => {
        runIDs.push(run.id);
        return run.tests.filter(
          (test) => test.status_id === config.status.untested
        );
      });

    expect(untestedTests.length).toBeTruthy();
  });

  test("Verify that the message 'TestRailException: Field is not a valid milestone.' is handled when milestone_id is not valid.", async () => {
    const newData = {
      include_all: true,
      run_name: "Test Run Vitest",
      milestone_id: 42,
    };

    modifyConfig(configPath, {
      ...config,
      create_new_run: newData,
    });

    try {
      console.info("Starting NewRun tests with invalid milestone ID...");
      execSync("npm run newRun", { stdio: "pipe" });
    } catch (error) {
      const output = error.stdout.toString();
      expect(output).toContain("Field :milestone_id is not a valid milestone");
    }
  });
});

describe("Update Result with Interval", async () => {
  let trFunc;
  let getRunsBeforeNewRun;
  let runIDs = [];
  beforeAll(async () => {
    backupConfig(configPath);
    trFunc = new TestRailFunc(config);
  });

  afterAll(async () => {
    restoreConfig(configPath);
    let delRuns = await trFunc.deleteRun(runIDs);
    console.info("🚀 ~ afterAll ~ delRuns:", delRuns);
  });

  test("Interval / testRailUpdateInterval is not equal to 0", async () => {
    let testRunInterval = 7;
    modifyConfig(configPath, {
      ...config,
      testRailUpdateInterval: testRunInterval,
    });

    console.info("Running child tests with interval ...");
    exec("npm run newRun || true", (error, stdout, stderr) => {
      if (error) {
        console.error(`Error executing command: ${stderr}`);
      } else {
        console.info(`Command output: ${stdout}`);
      }
    });

    await delay(2);
    getRunsBeforeNewRun = await trFunc.getRuns();
    const noResults = await trFunc
      .getRun(getRunsBeforeNewRun[getRunsBeforeNewRun.length - 1].id)
      .then((run) => {
        runIDs.push(run.id);
        return run.tests.every((test) => !("results" in test));
      });

    expect(noResults).toBe(true);

    await delay(testRunInterval);
    getRunsBeforeNewRun = await trFunc.getRuns();
    const withResults = await trFunc
      .getRun(getRunsBeforeNewRun[getRunsBeforeNewRun.length - 1].id)
      .then((run) => {
        return run.tests.map((test) => test.results).every((res) => res.length);
      });

    expect(withResults).toBe(true);
  });
});

describe("Updating Existing Run", async () => {
  let trFunc;
  let getRunsBeforeNewRun;
  let runIDs = [];
  beforeAll(async () => {
    backupConfig(configPath);
    trFunc = new TestRailFunc(config);
    console.info("Running child tests for ExistingRun Cases...");
    execSync("npm run newRun || true", {
      stdio: "pipe",
    });
  });

  afterAll(async () => {
    restoreConfig(configPath);
    let delRuns = await trFunc.deleteRun(runIDs);
    console.info("🚀 ~ afterAll ~ delRuns:", delRuns);
  });

  test("Existing Run / Valid id in the use_existing_run", async () => {
    getRunsBeforeNewRun = await trFunc.getRuns();
    let myRun = await trFunc.getRun(
      getRunsBeforeNewRun[getRunsBeforeNewRun.length - 1].id
    );
    runIDs.push(myRun.id);

    modifyConfig(configPath, {
      ...config,
      use_existing_run: { id: myRun.id },
    });

    console.info("Starting ExistingRun tests with valid run ID...");
    execSync("npm run newRun || true", {
      stdio: "inherit",
    });

    myRun = await trFunc.getRun(myRun.id);
    const testsGiveTwoResults = await myRun.tests
      .filter((test) => test.status_id != config.status.skipped)
      .map((test) => test.results)
      .every((res) => res.length === 2);

    expect(testsGiveTwoResults).toBeTruthy;
  });

  test("Existing Run / Invalid id in the use_existing_run", async () => {
    getRunsBeforeNewRun = await trFunc.getRuns();
    const myRun = await trFunc.getRun(
      getRunsBeforeNewRun[getRunsBeforeNewRun.length - 1].id
    );

    modifyConfig(configPath, {
      ...config,
      use_existing_run: { id: myRun.id + 1 },
    });

    try {
      console.info("Starting ExistingRun tests with invalid run ID...");
      execSync("npm run newRun", { stdio: "pipe" });
    } catch (error) {
      const output = error.stdout.toString();
      expect(output).toContain("Run not found");
    }
  });
});
