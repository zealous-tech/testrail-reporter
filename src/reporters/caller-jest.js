const { BaseClass } = require("../base");
const getLogger = require("../logger");
const logger = getLogger();
const testResults = require("../base").testResults;
const case_ids = require("../base").case_ids;


const formatError = (error) => 
{
  const str = Array.isArray(error) ? error.join('\n') : String(error);
  return str
    .replace(/\x1B\[[0-9;]*m/g, '')
    .split('\n')
    .filter(Boolean)
    .slice(0, 3)
    .join('\n');
};

const pass = "passed"
const fail = "failed"
global.need_to_stop = false;

let removedCaseIds = [];
let existingCaseIds = [];
let suiteCaseIds = [];
let getCasesResponse;


class JestCaller extends BaseClass 
{
    constructor() 
    {
        super();
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

    async onTestCaseResult(test, testCaseResult) 
    {
        const allowedStatuses = new Set(['passed', 'failed']);
        if (!allowedStatuses.has(testCaseResult.status)) 
        {
            return;
        }

        let status = "";
        if (testCaseResult.status === pass) status = "passed";
        if (testCaseResult.status === fail) status = "failed";

        const case_ids_from_title = this.utils._extractCaseIdsFromTitle(testCaseResult.title);
        case_ids_from_title.forEach((item) => 
        {
            const status_id = this.config.getStatus(status);
            case_ids.push(item);
            const comment = status === 'failed'
                  ? `#Error message:#\n ${ formatError(testCaseResult.failureMessages[0])}\n`
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

        if (this.config.createMissingCases && case_ids_from_title.length === 0) 
        {
            this.missingCasesTitles.push(testCaseResult.title);
        }
    }

    async onRunComplete (testContexts, results) 
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
            await this.waitForRun();
            await this.updateTestRailResults(testResults);
        }
        global.need_to_stop = true;
        this.logRunURL();
    }
}


module.exports = JestCaller;
