// const { blue, underline } = require("colorette");
const Utils = require("../utils.js");
const { setTimeout } = require("timers/promises");
const BaseClass = require("../base").BaseClass;
const testResults = require("../base").testResults;
const case_ids = require("../base").case_ids;
const getLogger = require("../logger.js");
const logger = getLogger();

const startList = {};
global.need_to_stop = false;
let files_count = 0;
let paths_count = 0;
let runId = 0;
let createRunResponse;
let removedCaseIds = [];
let existingCaseIds = [];
let suiteCaseIds = [];
let getCasesResponse;

class CallerVitest extends BaseClass {
  constructor() {
    super();
    this.utils = new Utils();
  }

  onInit() {
    logger.debug("oniInit");
    logger.info("The reporter started successfully!");
  }

  onPathsCollected(paths) {
    logger.debug("onPathsCollected");
    paths_count = paths.length;
  }

  async onCollected(file) {
    const setRunId = async () => {
      runId = this.testrailConfigs.use_existing_run.id;
      await this.tr_api
        .getRun(runId)
        .then(() => {
          logger.info("The runId is a valid test run id!!");
        })
        .catch((error) => {
          logger.error(error.message);
          throw error.message;
        });
      logger.info(
        `The Run started, utilizing an existing TestRail Run` +
          `with "${runId}" id.`
      );
    };

    const getSuiteCaseIds = async () => {
      getCasesResponse = await this.tr_api
        .getCases(this.testrailConfigs.project_id, {
          suite_id: this.testrailConfigs.suite_id,
        })
        .catch((err) => {
          const configProjectId = this.testrailConfigs.project_id;
          const configSuiteId = this.testrailConfigs.suite_id;
          logger.error(
            `Failed to get test cases from project by` +
              `" ${configProjectId}" id` +
              ` and suite by "${configSuiteId}" id.` +
              ` \nPlease check your TestRail configuration.`
          );
          logger.error(err);
          process.exit(1);
        });
      for (let val of getCasesResponse) {
        suiteCaseIds.push(val.id);
      }
    };

    const informAboutMissingCases = () => {
      if (removedCaseIds.length > 0) {
        if (this.needToCreateRun) {
          logger.warn(
            `The provided TestRail suite does not contain` +
              ` the following case ids: [${removedCaseIds}]`
          );
        }
      }
    };

    const addRunToTestRail = async () => {
      if (this.needToCreateRun) {
        createRunResponse = await this.addRunToTestRail(existingCaseIds).catch(
          (err) => {
            logger.error(err.message);
            throw err.message;
          }
        );
        runId = createRunResponse.id;
      }
    };

    logger.debug("onCollected");
    files_count++;
    this.processStartList(file);
    if (files_count === paths_count) {
      if (this.testrailConfigs.use_existing_run.id !== 0) {
        await setRunId();
      } else {
        await getSuiteCaseIds();
        logger.debug("suiteCaseIds: ", suiteCaseIds);
        removedCaseIds = case_ids.filter(
          (item) => !suiteCaseIds.includes(item)
        );
        logger.debug("removedCaseIds: ", removedCaseIds);
        existingCaseIds = case_ids.filter((item) =>
          suiteCaseIds.includes(item)
        );
        logger.debug("existingCaseIds: ", existingCaseIds);
        this.needToCreateRun = this.needNewRun(
          case_ids,
          existingCaseIds,
          removedCaseIds
        );
        informAboutMissingCases();
        await addRunToTestRail();
      }
      if (this.testrailConfigs.testRailUpdateInterval !== 0) {
        this.startScheduler(runId);
      }
    }
  }

  onTaskUpdate(packs) {
    logger.debug("onTaskUpdate");
    packs.forEach((element) => {
      const testRunId = element[0];
      const case_id = startList[testRunId];
      if (case_id && element[1].duration >= 0) {
        if (element[1].state === "pass") element[1].state = "passed";
        if (element[1].state === "fail") element[1].state = "failed";
        const status_id = this.testrailConfigs.status[element[1].state];
        const comment =
          status_id === this.testrailConfigs.status.failed
            ? `#Error message:#\n ${JSON.stringify(
                element[1].errors[0].message,
                null,
                "\t"
              )}\n`
            : "PASS";
        const data = {
          case_id: +case_id,
          status_id,
          comment,
          elapsed: this.utils._formatTime(element[1].duration) || "",
          defects: "",
          version: "",
        };
        testResults.push(data);
      }
    });
  }

  async onFinished(packs) {
    logger.debug("onFinished");
    if (this.testrailConfigs.testRailUpdateInterval === 0) {
      while (runId === 0) {
        await setTimeout(100);
      }
      await this.updateTestRailResults(testResults, runId);
    }
    global.need_to_stop = true;
    let runUrl = `${this.testrailConfigs.base_url}/index.php?/runs/view/${runId}`;
    logger.info("TestRail Run URL:\n" + runUrl);
  }

  processStartList(arr) {
    for (const element of arr) {
      if (!element.name.match(/[@C][?\d]{1,8}$/gm) && element.tasks) {
        this.processStartList(element.tasks);
      } else {
        const case_id = this.utils._formatTitle(element.name);
        if (case_id != null) {
          case_ids.push(parseInt(case_id[1]));
        }
        if (element.mode === "skip") {
          if (case_id && case_id[1]) {
            startList[element.id] = +case_id[1];
          }
          const data = {
            case_id: case_id ? +case_id[1] : 0,
            status_id: this.testrailConfigs.status.skipped,
            comment: "This test was marked as 'Skipped'.",
            elapsed: "",
            defects: "",
            version: "",
          };
          testResults.push(data);
        } else {
          if (case_id) {
            startList[element.id] = +case_id[1];
          }
        }
      }
    }
  }
}

module.exports = CallerVitest;
