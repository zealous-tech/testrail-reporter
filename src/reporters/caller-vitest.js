const { setTimeout } = require("timers/promises");
const BaseClass = require("../base").BaseClass;
const testResults = require("../base").testResults;
const case_ids = require("../base").case_ids;

const getLogger = require("../logger");
const logger = getLogger();
const constants = require("../constants");


global.need_to_stop = false;
let removedCaseIds = [];
let existingCaseIds = [];
let suiteCaseIds = [];
let getCasesResponse;


class CallerVitest extends BaseClass 
{
  constructor() 
  {
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

  async getSuiteCaseIds()  
  {
    getCasesResponse = await this.getAllCasesFromTestRail()    
    for (let val of getCasesResponse) 
    {
      suiteCaseIds.push(val.id);
    }
  };

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

  async onInit() 
  {
    logger.debug("oniInit");
    logger.info("The reporter started successfully!");
  }


  async onTestSuiteReady (testSuite) 
  {
    const childTasks = testSuite.task?.tasks || [];
    if (childTasks.length > 0) 
    {
      for (const task of childTasks) 
      {
        await this.processStartList(task);
      }
    } 
    else 
    {
      logger.debug("No child tests found in this suite.");
    }
  }

  async processStartList(element) 
  { 
    if (element.mode === "skip")  
    {
      logger.info("This test was marked as 'Skipped'.");
      return;
    }

    const case_id = this.utils._extractCaseIdsFromTitle(element.name);
    if (case_id != null && case_id.length > 0) 
    {
      case_id.forEach((item) => 
      {
        case_ids.push(item)
      });
    }
    
    if (this.config.createMissingCases) 
    {
      this.missingCasesTitles.push(element.name);
    }
  }

  async onTestCaseResult(testCase)
  {
    if (testCase.task.mode === "skip")
    {
      logger.info("This test was marked as 'Skipped'.");
      return;
    }

    const tesCaseResult = testCase.task.result;
    let status = "";
    if (tesCaseResult.state === "pass") status = "passed";
    if (tesCaseResult.state === "fail") status = "failed";

    if (status === "failed" && 
      !tesCaseResult.errors[0].name.toLowerCase().includes(constants.ASSERTION_ERROR))
    {
      logger.info("This test is failed with non-assertion error, it will be marked as 'Untested' in TestRail.");
      return;
    }

    const case_ids = this.utils._extractCaseIdsFromTitle(testCase.task.name);
    case_ids.forEach((item) => 
    {
      const status_id = this.config.getStatus(status);
      const comment = status === 'failed'
            ? `#Error message:#\n ${JSON.stringify(
              tesCaseResult.errors[1].message,
              null,
              "\t",
            )}\n`
            : "PASS";
      const data =
      {
        case_id: item,
        status_id,
        comment,
        elapsed: "",
        defects: "",
        version: "",
        attachments: [],
      };

      const existingIndex = testResults.findIndex(r => r.case_id === item);
      if (existingIndex >= 0) 
      {
        testResults[existingIndex] = data;
      } 
      else 
      {
        testResults.push(data);
      }
    })    
  }

  async onTestRunEnd(testModules, unhandledErrors, reason)
  {    
    if(testResults.length === 0) { return }
    logger.debug("onTestSuiteReady start");    
    if (await this.config.useExistingRun.id == 0)
    {
      await this.getSuiteCaseIds();
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
      this.informAboutMissingCases();
      await this.addRunToTestRail(existingCaseIds);
      await this.updateTestRunIncludeAllField
      (
        false,
        await this.getCasesIdsFromRun()
      )
    }
    if (await this.config.updateInterval !== 0) 
    {
      await this.startScheduler();
    }
    const createdNewTestCasesIds = await this.addMissingCasesToTestSuite();
    await this.addMissingCasesToRun
    (
      [...case_ids, ...createdNewTestCasesIds]
    );
    if (await this.config.updateInterval === 0) 
    {
      // Ensure a run exists (created in onCollected) before pushing results
      await this.waitForRun();
      await this.updateTestRailResults(testResults);
    }
    global.need_to_stop = true;
    this.logRunURL();
  }
}

module.exports = CallerVitest;
