const TestRail = require("@dlenroc/testrail");
const schedule = require("node-schedule");
const fs = require("fs");
const path = require("path");
const getLogger = require("./logger.js");
const logger = getLogger();

const DEFAULT_CONFIG_FILENAME = "testrail.config.js";
const configPath = path.resolve(process.cwd(), DEFAULT_CONFIG_FILENAME);
const {
  base_url,
  user,
  pass,
  project_id,
  suite_id,
  create_missing_cases,
  testRailUpdateInterval,
  updateResultAfterEachCase,
  use_existing_run,
  create_new_run,
  status,
} = require(configPath);

const testResults = [];
const case_ids = [];
const copiedTestResults = [];
const expectedFailures = {};

class BaseClass {
  constructor() {
    // TODO: fix naming
    this.testrailConfigs = {
      base_url: base_url,
      user: user,
      pass: pass,
      project_id: project_id,
      suite_id: suite_id,
      create_missing_cases: create_missing_cases,
      testRailUpdateInterval: testRailUpdateInterval,
      updateResultAfterEachCase: updateResultAfterEachCase,
      use_existing_run: use_existing_run,
      create_new_run: create_new_run,
      status: status,
    };

    this.tr_api = new TestRail({
      host: this.testrailConfigs.base_url,
      username: this.testrailConfigs.user,
      password: this.testrailConfigs.pass,
    });

    this.rule =
      this.testrailConfigs.testRailUpdateInterval <= 59
        ? `*/${this.testrailConfigs.testRailUpdateInterval} * * * * *`
        : `*/${Math.round(
            this.testrailConfigs.testRailUpdateInterval / 60,
          )} * * * *`;

    // TODO: complete related functionality
    // this variable is used to decide
    // if we need to create a new run in TestRail
    this.needToCreateRun = true;

    this.runURL = "";
    this.missingCasesTitles = [];
    this.createdCasesData = [];
    this.newCasesOutputFile = "testrail_created_cases.json";
  }

  addRunToTestRail = async (case_ids) => {
    logger.info("Adding new Run to TestRail");
    const today = new Date();
    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const monthAbbreviation = monthNames[today.getMonth()];
    return await this.tr_api.addRun(this.testrailConfigs.project_id, {
      suite_id: this.testrailConfigs.suite_id,
      milestone_id:
        this.testrailConfigs.create_new_run.milestone_id !== 0
          ? this.testrailConfigs.create_new_run.milestone_id
          : undefined,
      name:
        `${this.testrailConfigs.create_new_run.run_name}` +
        ` ${today.getDate()}-${monthAbbreviation}` +
        `-${today.getFullYear()}` +
        ` ${today.toTimeString().split(" ")[0]}`,
      description: "TestRail automatic reporter module",
      include_all: this.testrailConfigs.create_new_run.include_all,
      case_ids: case_ids,
    });
  };

  async updateTestRailResults(testRailResults, runId) {
    if (testRailResults.length === 0) {
      logger.warn(
        "No new results or added test cases" +
          " to update in TestRail. Skipping...",
      );
      return;
    }
    logger.info(`Adding run results(${testRailResults.length}) to TestRail`);
    let result;
    await this.tr_api
      .getCases(this.testrailConfigs.project_id, {
        suite_id: this.testrailConfigs.suite_id,
      })
      .then((tests) => {
        tests.forEach(({ id, custom_bug_ids }) => {
          expectedFailures[id] = !!custom_bug_ids;
        });
        result = testRailResults.reduce((acc, item) => {
          if (expectedFailures[item.case_id] != undefined) {
            let status_id = item.status_id;
            if (expectedFailures[item.case_id] === true) {
              if (status_id === this.testrailConfigs.status.pass) {
                status_id = this.testrailConfigs.status.fixed;
              }
              if (status_id === this.testrailConfigs.status.fail) {
                status_id = this.testrailConfigs.status.expFail;
              }
            }
            return [...acc, { ...item, status_id }];
          } else {
            return acc;
          }
        }, []);
      })
      .then(async () => {
        if (this.testrailConfigs.use_existing_run.id != 0) {
          await this.tr_api
            .getResultsForRun(this.testrailConfigs.use_existing_run.id)
            .then((results) => {
              logger.debug("Results:\n", results);
              results.forEach((res) => {
                if (res.status_id != this.testrailConfigs.status.untested) {
                  result = result.filter(
                    (testCase) =>
                      testCase.status_id !==
                      this.testrailConfigs.status.skipped,
                  );
                }
              });
            });
        }
        const res = {
          results: result,
        };
        await this.tr_api
          .addResultsForCases(runId, res)
          .then(async (apiRes) => {
            logger.info("Test result added to TestRail successfully!");
            await this.uploadAttachmentsToTestRail(result, apiRes);
          })
          .catch((error) => {
            logger.error("Failed to add test result");
            logger.error(error);
            logger.debug("Run ID: ", runId);
            logger.debug("res:\n", res);
          });
      })
      .catch((err) => logger.error(err));
  }

  async uploadAttachmentsToTestRail(localResults, apiRes) {
    /*
     * This method uploads the attachments to the TestRail run.
     * It accepts the localResults representing the run test cases results
     * and the apiRes representing the test cases results from the TestRail.
     * */
    for (let i = 0; i < apiRes.length; i++) {
      let attachments = localResults[i].attachments;
      if (!attachments) {
        continue;
      }
      for (const attachment of attachments) {
        try {
          logger.info(`Uploading "${attachment}" attachment.`);
          const payload = {
            name: path.basename(attachment),
            value: fs.createReadStream(attachment),
          };
          await this.tr_api.addAttachmentToResult(apiRes[i].id, payload);
        } catch (error) {
          logger.warn(`Error uploading attachment: ${error.message}`);
        }
      }
    }
  }

  async addMissingCasesToTestSuite() {
    if (this.missingCasesTitles.length < 1) {
      return;
    }
    logger.info("\nAdding missing test cases to TestRail suite");
    let sections = await this.tr_api.getSections(
      this.testrailConfigs.project_id,
      {
        suite_id: this.testrailConfigs.suite_id,
      },
    );
    for (let title of this.missingCasesTitles) {
      // check if the section does not contain the case and then add it
      let caseId = await this.isCaseInSuite(title);
      if (caseId) {
        logger.warn(`\nCase already exists in suite: '${title}'`);
        continue;
      }
      let createdCase = await this.tr_api.addCase(sections[0].id, {
        title: title,
      });
      logger.info(`\nCase added to suite: '${title}'`);
      this.createdCasesData.push({
        id: createdCase.id,
        title: createdCase.title,
        section_id: createdCase.section_id,
        suite_id: createdCase.suite_id,
      });
    }
    this.writeCreatedCasesToFile();
  }

  async writeCreatedCasesToFile() {
    if (this.createdCasesData.length > 0) {
      fs.writeFileSync(
        this.newCasesOutputFile,
        JSON.stringify(this.createdCasesData, null, 2),
      );
      logger.info(`\n\nNew cases added to ${this.newCasesOutputFile}\n\n`);
    }
  }

  async isCaseInSuite(title) {
    let cases = await this.tr_api.getCases(this.testrailConfigs.project_id, {
      suite_id: this.testrailConfigs.suite_id,
    });
    let caseIds = cases.map((item) => item.id);
    let caseTitles = cases.map((item) => item.title);
    let caseIndex = caseTitles.indexOf(title);
    return caseIds[caseIndex];
  }

  startScheduler(runId) {
    logger.info("Starting scheduler");
    const job = schedule.scheduleJob({ rule: this.rule }, () => {
      this.updateCurrentResults(runId);
      if (global.need_to_stop && job) {
        job.cancel();
      }
    });
  }

  async updateCurrentResults(runId) {
    logger.debug("updateCurrentResults");
    const testRailResults = [];
    for (const result of testResults) {
      const existsInCopied = copiedTestResults.some(
        (item) => item.case_id === result.case_id,
      );
      if (!existsInCopied) {
        copiedTestResults.push(result);
        testRailResults.push(result);
      }
    }
    if (testRailResults.length > 0) {
      await this.updateTestRailResults(testRailResults, runId);
    }
  }

  isTestFailed(result) {
    /*
     * The method is used to check if the test case is failed.
     * It accepts the test case result object received from the test runner
     * in 'onTestEnd' hook.
     * */
    return (
      result.status === "failed" ||
      result.status === "timedOut" ||
      result.status === "interrupted"
    );
  }

  isTestFailedByStatusId(statusId) {
    /*
     * The method is used to check if the test case is failed by statusId.
     * It accepts the status_id of the test case result
     * received from the TestRail.
     * */
    return (
      statusId === this.testrailConfigs.status.failed ||
      statusId === this.testrailConfigs.status.expFail
    );
  }

  setTestComment(result) {
    if (this.isTestFailed(result)) {
      return (
        "Test Status is " +
        result.status +
        ".\n" +
        result.error?.message?.replace(/\u001b\[\d+m/g, "")
      );
    } else if (result.status == "skipped") {
      return "This test was marked as 'Skipped'.";
    } else {
      return "Test Passed within " + result.duration + " ms.";
    }
  }

  needNewRun(case_ids, existingCaseIds, removedCaseIds) {
    /*
     * If the test case ids are not found in the TestRail suite,
     * or the test case ids are not provided,
     * the reporter will not exit, but will inform the user about it.
     * Returns true if the TestRail run needs to be created.
     * */
    if (removedCaseIds == case_ids || existingCaseIds.length == 0) {
      logger.warn(
        `The provided TestRail suite does not contain` +
          ` any of the provided case ids.` +
          ` No TestRail run will be created.`,
      );
      return false;
    }
    return true;
  }

  logRunURL() {
    if (this.runURL != "") {
      logger.info(`TestRail Run URL:\n${this.runURL}`);
    }
  }
}

module.exports = {
  BaseClass,
  testResults,
  case_ids,
  copiedTestResults,
};
