const { setTimeout } = require("timers/promises");
const BaseClass = require("../base").BaseClass;
const testResults = require("../base").testResults;
const case_ids = require("../base").case_ids;

const getLogger = require("../logger");
const logger = getLogger();

global.need_to_stop = false;

let removedCaseIds = [];
let existingCaseIds = [];
let suiteCaseIds = [];


class CallerMochaReporter extends BaseClass 
{
  constructor() 
  {
    super();
    this.runReady = false;
    this.buffer = [];
  }

  async waitForRun({ timeoutMs = 30000, intervalMs = 200 } = {}) 
  {
    const start = Date.now();
    while (!(await this.config.activeRun)) 
    {
        if (Date.now() - start > timeoutMs) 
        {
            throw new Error(`Timed out after ${timeoutMs}ms waiting for TestRail run to be created`);
        }
        await setTimeout(intervalMs);
    }
  }

  async handleTestResult(test) 
  {
    const state = test.state;
    if (!state) return;

    const status = state === "passed" ? "passed" : "failed";
    const caseIds = this.utils._extractCaseIdsFromTitle(test.title);

    for (const item of caseIds || []) 
    {
      case_ids.push(item);
      const data = 
      {
        case_id: item,
        status_id: this.config.getStatus(status),
        comment:
          status === "failed"
            ? `#Error message:#\n ${test.error || ""}`
            : "PASS",
        elapsed:  "",
        defects: "",
        version: "",
        attachments: [],
      };

      if (!this.runReady) 
      {
        this.buffer.push(data);
      } 
      else 
      {
        this.upsertResult(data);
      }
    }

    if (this.config.createMissingCases && caseIds.length === 0) 
    {
      this.missingCasesTitles.push(test.title);
    }
  }

  async finalizeAndSyncTestRailRun() 
  {
    logger.debug("Run end");
    if (this.buffer.length) 
    {
      testResults.push(...this.buffer);
      this.buffer = [];
    }
    if (testResults.length === 0) return;

    if (this.config.useExistingRun?.id === 0) 
    {
      await this.getSuiteCaseIds();

      removedCaseIds = case_ids.filter(
        (i) => !suiteCaseIds.includes(i)
      );

      existingCaseIds = case_ids.filter(
        (i) => suiteCaseIds.includes(i)
      );

      this.needToCreateRun = this.needNewRun(
        case_ids,
        existingCaseIds,
        removedCaseIds
      );

      this.informAboutMissingCases();
      await this.addRunToTestRail(existingCaseIds);

      await this.updateTestRunIncludeAllField(
        false,
        await this.getCasesIdsFromRun()
      );
    }

    if (this.config.updateInterval !== 0) 
    {
      await this.startScheduler();
    }

    const createdNewTestCasesIds =
      await this.addMissingCasesToTestSuite();

    await this.addMissingCasesToRun([
      ...case_ids,
      ...createdNewTestCasesIds,
    ]);

    if (this.config.updateInterval === 0) 
    {
      await this.waitForRun();
      await this.updateTestRailResults(testResults);
    }

    global.need_to_stop = true;
    this.logRunURL();
  }

  informAboutMissingCases() 
  {
    if (removedCaseIds.length > 0) 
    {
      if (this.needToCreateRun) 
      {
        logger.warn
        (
          `The provided TestRail suite does not contain` +
          ` the following case ids: [${removedCaseIds}]`,
        );
      }
    }
  };

  async getSuiteCaseIds()  
  {
    let getCasesResponse = await this.getAllCasesFromTestRail()    
    for (let val of getCasesResponse) 
    {
        suiteCaseIds.push(val.id);
    }
  };

  upsertResult(data) 
  {
    const idx = testResults.findIndex(
      (r) => r.case_id === data.case_id
    );

    if (idx >= 0) testResults[idx] = data;
    else testResults.push(data);
  }
}

module.exports = CallerMochaReporter;