const TestRail = require("@dlenroc/testrail");
const schedule = require("node-schedule");
const fs = require("fs");
const path = require("path");
const Utils = require("./utils");
const getLogger = require("./logger");
const logger = getLogger();
const constants = require("./constants/constants");
const filePaths = require("./constants/filePaths");
const { getConfigManager } = require("./managers/configManager");

const testResults = [];
const case_ids = [];
const copiedTestResults = [];
const expectedFailures = {};

class BaseClass {
  constructor(configManager = getConfigManager()) {
    this.config = configManager;

    this.tr_api = new TestRail({
      host: this.config.baseUrl,
      username: this.config.user,
      password: this.config.pass,
    });

    this.rule =
      this.config.updateInterval <= 59
        ? `*/${this.config.updateInterval} * * * * *`
        : `*/${Math.round(this.config.updateInterval / 60,)} * * * *`;

    // TODO: complete related functionality
    // this variable is used to decide
    // if we need to create a new run in TestRail
    this.needToCreateRun = true;

    this.missingCasesTitles = [];
    this.missingCasesIds = [];
    this.createdCasesData = [];
    this.newCasesOutputFile = filePaths.NEW_CASES_OUTPUT;
    this.utils = new Utils();
  }

  needToCollectMissingCases() {
    return (
      this.config.createMissingCases ||
      this.config.addMissingCasesToRun
    );
  }

  async addRunToTestRail(caseIds = []) {
    if (!Array.isArray(caseIds)) {
      throw new TypeError("addRunToTestRail expects an array of case IDs");
    }

    const projectId = this.config.projectId;
    const suiteId = this.config.suiteId;
    const { milestone_id: milestoneId, run_name: runName, include_all: includeAll } = this.config.createNewRun;

    // modern timestamp
    const timestamp = await this.utils._dateInDdMmYyyyHhMmSs();
    const name = `${runName} ${timestamp}`;

    logger.info(`Creating TestRail run "${name}" in project ${projectId}`);

    // simple retry
    let response;
    for (let i = 1; i <= 3; i++) {
      try {
        response = await this.tr_api.addRun(projectId, {
          suite_id: suiteId,
          milestone_id: milestoneId || undefined,
          name,
          description: "Automated TestRail reporter",
          include_all: includeAll,
          case_ids: caseIds,
        });
        break;
      } catch (err) {
        logger.warn(`addRunToTestRail attempt ${i} failed: ${err.message}`);
        if (i === 3) throw new Error(`Failed to add run after 3 attempts: ${err.message}`);
        await new Promise(res => setTimeout(res, 1000 * i));
      }
    }

    this.config.setRun({ id: response.id, url: response.url });
    logger.info(`TestRail run created: ${response.url}`);
  };

  async updateTestRunIncludeAllField(fieldValue = false, casesId) {
    logger.debug(`Updating include_all field value to ${fieldValue}`);
    const runId = await this.config.activeRunId;
    if (!runId) throw new Error("No active TestRail run id");
    await this.tr_api.updateRun(runId, {
      include_all: fieldValue,
      case_ids: casesId
    });
  }

  async getCasesIdsFromRun() {
    logger.info("Fetching cases ids from test run");
    const runId = await this.config.activeRunId;
    if (!runId) throw new Error("No active TestRail run id");
    const casesIdInRun = [];
    let response;
    do {
      response = await this.tr_api.getTests
        (
          runId,
          {
            offset: casesIdInRun.length,
            limit: constants.MAX_CASES_PER_RUN_FETCH
          }
        );
      response.forEach((item) => { casesIdInRun.push(item.case_id) });
      logger.info(`Fetched cases count equal to ${casesIdInRun.length}`);
    } while (response.length != 0);
    return casesIdInRun;
  }

  async updateTestRailResults(testRailResults) {
    const runId = await this.config.activeRunId;
    if (!runId) throw new Error("No active TestRail run id");
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
      .getCases(this.config.projectId, {
        suite_id: this.config.suiteId,
      })
      .then((tests) => {
        tests.forEach(({ id, custom_bug_ids }) => {
          expectedFailures[id] = !!custom_bug_ids;
        });
        result = testRailResults.reduce((acc, item) => {
          if (expectedFailures[item.case_id] != undefined) {
            let status_id = item.status_id;
            if (expectedFailures[item.case_id] === true) {
              if (status_id === this.config.getStatus('passed')) {
                status_id = this.config.getStatus('fixed');
              }
              if (status_id === this.config.getStatus('failed')) {
                status_id = this.config.getStatus('expFail');
              }
            }
            return [...acc, { ...item, status_id }];
          } else {
            return acc;
          }
        }, []);
      })
      .then(async () => {
        if (this.config.useExistingRun.id != 0) {
          await this.tr_api
            .getResultsForRun(this.config.activeRunId)
            .then((results) => {
              logger.debug("Results:\n", results);
              results.forEach((res) => {
                if (res.status_id != this.config.getStatus('untested')) {
                  result = result.filter(
                    (testCase) =>
                      testCase.status_id !==
                      this.config.getStatus('skipped'),
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
            logger.debug("Results:\n", res);
          });
      })
      .catch((err) => logger.error(err));
  }

  /**
   * This method uploads the attachments to the TestRail run.
   * It accepts the localResults representing the run test cases results
   * and the apiRes representing the test cases results from the TestRail.
   * @param {Array<Object>} localResults  – your objects, each with an `attachments` array
   * @param {Array|Object} apiRes         – what addResultsForCases returned
   */
  async uploadAttachmentsToTestRail(localResults, apiRes) {
    // Normalize to array
    const resultsArray = Array.isArray(apiRes)
      ? apiRes
      : Array.isArray(apiRes.results)
        ? apiRes.results
        : [];

    if (resultsArray.length !== localResults.length) {
      logger.warn(
        `uploadAttachmentsToTestRail: mismatch between localResults (${localResults.length}) ` +
        `and apiRes (${resultsArray.length})`
      );
    }

    // Only iterate as far as both lists overlap
    const count = Math.min(resultsArray.length, localResults.length);
    for (let i = 0; i < count; i++) {
      const attachments = localResults[i].attachments;
      const resultId = resultsArray[i].id;
      if (!resultId) {
        logger.warn(`No TestRail result id at index ${i}, skipping attachments`);
        continue;
      }
      // Filter out any invalid entries up‑front
      const validFiles = attachments.filter(fp => typeof fp === 'string' && fp.trim() !== '');
      if (validFiles.length !== attachments.length) {
        logger.warn(
          `uploadAttachmentsToTestRail: some attachments for result ${resultId} ` +
          `are invalid/non‑string: ${JSON.stringify(attachments)}`
        );
      }
      for (const filePath of validFiles) {
        try {
          logger.info(`Uploading attachment "${filePath}" for result ${resultId}`);
          await this.tr_api.addAttachmentToResult(
            resultId,
            { name: path.basename(filePath), value: fs.createReadStream(filePath) }
          );
        } catch (err) {
          logger.warn(
            `Error uploading "${filePath}" for result ${resultId}: ${err.message}`
          );
        }
      }
    }
  }

  async addMissingCasesToTestSuite() {
    if (this.missingCasesTitles.length < 1
      || this.config.createMissingCases == false) {
      logger.info("Create_missing_cases flag is false no case will be added");
      return [];
    }

    const createdTestCasesId = []
    logger.info("Adding missing test cases to TestRail suite");
    let sections = await this.tr_api.getSections(
      this.config.projectId,
      {
        suite_id: this.config.suiteId,
      },
    );
    for (let title of this.missingCasesTitles) {
      // check if the section does not contain the case and then add it
      let caseId = await this.isCaseInSuite(title);
      if (caseId) {
        logger.warn(`\nCase already exists in suite: '${title}'`);
        continue;
      }
      // TODO change hardcoded section to choose dynamic
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
      createdTestCasesId.push(createdCase.id)
    }
    this.writeCreatedCasesToFile();
    return createdTestCasesId
  }

  async getCreatedCaseIdsByTitle(testTitle) {
    if (this.config.addMissingCasesToRun == false) {
      logger.info(`Skipping result for "${testTitle}" because add_missing_cases_to_run is disabled.`);
      return [];
    }

    if (this.createdCasesData.length > 0) {
      const result = this.createdCasesData.find(
        item => item.title?.trim().toLowerCase() === testTitle?.trim().toLowerCase()
      );
      return [result.id];
    }
  }

  async addMissingCasesToRun(allTestCasesId) {
    if (!this.config.addMissingCasesToRun) {
      logger.info("\nNo missing case was added into the run");
      return;
    }
    const runId = await this.config.activeRunId;
    if (!runId) throw new Error("No active TestRail run id");

    logger.info("\nAdding missing test cases to TestRail run");
    try {
      const response = await this.tr_api.getTests(runId)
      const caseIds = response.map(({ case_id }) => {
        return case_id
      })

      const payload =
      {
        case_ids: [...allTestCasesId, ...caseIds],
      };
      await this.tr_api.updateRun(runId, payload);
      logger.info("\nTest run updated successfully\n");
    }
    catch (error) {
      logger.error("\nFailed to update the test run:\n", error);
    }
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
    let cases = await this.tr_api.getCases(this.config.projectId, {
      suite_id: this.config.suiteId,
    });
    let caseIds = cases.map((item) => item.id);
    let caseTitles = cases.map((item) => item.title);
    let caseIndex = caseTitles.indexOf(title);
    return caseIds[caseIndex];
  }

  async startScheduler() {
    const runId = await this.config.activeRunId;
    if (!runId) throw new Error("No active TestRail run id");
    logger.info("Starting scheduler");
    const job = schedule.scheduleJob({ rule: this.rule }, () => {
      this.updateCurrentResults(runId);
      if (global.need_to_stop && job) {
        job.cancel();
      }
    });
  }

  async updateCurrentResults() {
    const runId = await this.config.activeRunId;
    if (!runId) throw new Error("No active TestRail run id");
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

  /**
   * The method is used to check if the test case is failed.
   * It accepts the test case result object received from the test runner
   * in 'onTestEnd' hook.
   */
  isTestFailed(result) {
    return (
      result.status === "failed" ||
      result.status === "timedOut" ||
      result.status === "interrupted"
    );
  }

  /**
   * The method is used to check if the test case is failed by statusId.
   * It accepts the status_id of the test case result
   * received from the TestRail.
   */
  isTestFailedByStatusId(statusId) {
    return (
      statusId === this.config.getStatus('failed') ||
      statusId === this.config.getStatus('expFail')
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

  /**
   * If the test case ids are not found in the TestRail suite,
   * or the test case ids are not provided,
   * the reporter will not exit, but will inform the user about it.
   * Returns true if the TestRail run needs to be created.
   */
  needNewRun(case_ids, existingCaseIds, removedCaseIds) {
    if (removedCaseIds.length === case_ids.length || existingCaseIds.length === 0) {
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
    const url = this.config.activeRunUrl;
    if (url) logger.info(`TestRail Run URL: ${url}`);
  }
}

module.exports = {
  BaseClass,
  testResults,
  case_ids,
  copiedTestResults,
};
