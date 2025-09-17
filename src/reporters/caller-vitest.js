const { setTimeout } = require("timers/promises");
const BaseClass = require("../base").BaseClass;
const testResults = require("../base").testResults;
const case_ids = require("../base").case_ids;
const getLogger = require("../logger");
const logger = getLogger();
const constants = require("../constants");

const startList = {};
global.need_to_stop = false;
let files_count = 0;
let paths_count = 0;
let removedCaseIds = [];
let existingCaseIds = [];
let suiteCaseIds = [];
let getCasesResponse;

class CallerVitest extends BaseClass {
  constructor() {
    super();
  }

  async waitForRun({ timeoutMs = 30000, intervalMs = 200 } = {}) {
    const start = Date.now();
    while (!(await this.config.activeRun)) {
      if (Date.now() - start > timeoutMs) {
        throw new Error(`Timed out after ${timeoutMs}ms waiting for TestRail run to be created`);
      }
      await setTimeout(intervalMs);
    }
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

    const getSuiteCaseIds = async () => {
      getCasesResponse = await this.tr_api
        .getCases(await this.config.projectId, {
          suite_id: await this.config.suiteId,
        })
        .catch((err) => {
          const configProjectId = this.config.projectId;
          const configSuiteId = this.config.suiteId;
          logger.error(
            `Failed to get test cases from project by` +
            `" ${configProjectId}" id` +
            ` and suite by "${configSuiteId}" id.` +
            ` \nPlease check your TestRail configuration.`,
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
            ` the following case ids: [${removedCaseIds}]`,
          );
        }
      }
    };

    logger.debug("onCollected");
    files_count++;
    this.processStartList(file);
    if (files_count === paths_count) {
      if (await this.config.useExistingRun.id !== 0) {
        // TODO: add catch block
        let runId = await this.config.activeRunId;
        logger.info(
          `The Run started, utilizing an existing TestRail Run` +
          ` with "${runId}" id.`);
      } else {
        await getSuiteCaseIds();
        logger.debug("suiteCaseIds: ", suiteCaseIds);
        removedCaseIds = case_ids.filter(
          (item) => !suiteCaseIds.includes(item),
        );
        logger.debug("removedCaseIds: ", removedCaseIds);
        existingCaseIds = case_ids.filter((item) =>
          suiteCaseIds.includes(item),
        );
        logger.debug("existingCaseIds: ", existingCaseIds);

        this.needToCreateRun = this.needNewRun(
          case_ids,
          existingCaseIds,
          removedCaseIds,
        );
        informAboutMissingCases();
        await this.addRunToTestRail(existingCaseIds);
        await this.updateTestRunIncludeAllField
          (
            false,
            await this.getCasesIdsFromRun()
          )
      }
      if (await this.config.updateInterval !== 0) {
        await this.startScheduler();
      }
      const createdNewTestCasesIds = await this.addMissingCasesToTestSuite();
      await this.addMissingCasesToRun
        (
          [...case_ids, ...createdNewTestCasesIds]
        );
    }
  }

  async onTaskUpdate(packs) {
    logger.debug("onTaskUpdate");
    packs.forEach((element) => {
      const testRunId = element[0];
      const case_id = startList[testRunId];
      if (case_id && element[1].duration >= 0) {
        if (element[1].state === "pass") element[1].state = "passed";
        if (element[1].state === "fail") element[1].state = "failed";
        const status_id = this.config.getStatus(element[1].state);
        const comment =
          status_id === this.config.getStatus('failed')
            ? `#Error message:#\n ${JSON.stringify(
              element[1].errors[0].message,
              null,
              "\t",
            )}\n`
            : "PASS";

        case_id.forEach((item) => {
          const data =
          {
            case_id: item,
            status_id,
            comment,
            elapsed: this.utils._formatTime(element[1].duration) || "",
            defects: "",
            version: "",
            // add screenshot as attachment
            attachments: [element[2].failScreenshotPath] || [],
          };
          testResults.push(data);
        })
      }
    });
  }

  async onFinished(packs) {
    logger.debug("onFinished");
    if (await this.config.updateInterval === 0) {
      // Ensure a run exists (created in onCollected) before pushing results
      await this.waitForRun();
      await this.updateTestRailResults(testResults);
    }
    global.need_to_stop = true;
    this.logRunURL();
  }

  processStartList(arr) {
    for (const element of arr) {
      if (!element.name.match(constants.CASE_ID_REGEX) && element.tasks) {
        this.processStartList(element.tasks);
      }
      else {
        const case_id = this.utils._extractCaseIdsFromTitle(element.name);
        if (case_id != null || case_id.length > 1) {
          case_id.forEach((item) => {
            case_ids.push(item)
          })
        }
        if (this.config.createMissingCases) {
          this.missingCasesTitles.push(element.name);
        }
        if (element.mode === "skip") {
          if (case_id && case_id[1]) {
            startList[element.id] = +case_id[1];
          }
          const data = {
            case_id: case_id ? +case_id[1] : 0,
            status_id: this.config.getStatus('skipped'),
            comment: "This test was marked as 'Skipped'.",
            elapsed: "",
            defects: "",
            version: "",
          };
          testResults.push(data);
        } else {
          if (case_id) {
            startList[element.id] = case_id.map((id) => +id);
          }
        }
      }
    }
  }
}

module.exports = CallerVitest;
