const { green: message, red: errorMessage } = require("colorette");
const Utils = require("../utils.js");
const process = require('process');
const getLogger = require('../logger.js');
const logger = getLogger('playwright_reporter');

const BaseClass = require("../base.js").BaseClass;
const testResults = require("../base.js").testResults;
const case_ids = require("../base.js").case_ids;
const copiedTestResults = require("../base.js").copiedTestResults;
const setTimeout = require('timers/promises').setTimeout;

global.need_to_stop = false;
let runId = 0;
let runUrl = ''
let commonIds = [];
let removedCaseIds = [];
let existingCaseIds = [];
let testrailRunCaseIds = [];
let suiteCaseIds = [];
let custom_step_results = [];
let getCasesResponse;
let createRunResponse;
let getTestsResponse;
let stepResult;
let actual;
let expected;
let existingCustomStepsSeparated = {};

class CallerPlaywright extends BaseClass {
    constructor() {
        super();
        this.utils = new Utils();
    }

    async onBegin(config, suite) {
        logger.debug('onBegin')
        let customStepsSeparatedMap = {};
        logger.info('The reporter started successfully');
        logger.debug('tesrail configs:\n ', this.tesrailConfigs)
        for (const val of suite.allTests()) {
            const case_details = this.utils._formatTitle(val.title);
            logger.debug('case details:\n', case_details)
            if (case_details != null) case_ids.push(parseInt(case_details[1]));
        }
        if (case_ids.length == 0) {
            logger.warn('No test cases found. Exiting...')
            process.exit(1);
        }
        logger.info('Running test cases with these ids:\n', case_ids)
        getCasesResponse = await this.tr_api.getCases(
            this.tesrailConfigs.project_id,
            { suite_id: this.tesrailConfigs.suite_id }
        )
            .catch((err) => {
                const configProjectId = this.tesrailConfigs.project_id;
                const configSuiteId = this.tesrailConfigs.suite_id;
                logger.error(
                    `Failed to get test cases from project by`
                    + `" ${configProjectId}" id`
                    +` and suite by "${configSuiteId}" id.`
                    + ` \nPlease check your TestRail configuration.`
                )
                logger.error(err);
                process.exit(1);
            });
        for (let val of getCasesResponse) {
            const testCaseId = await val.id;
            suiteCaseIds.push(testCaseId);
            // await this.tr_api.getCaseFields();
            customStepsSeparatedMap[testCaseId] = await val.custom_steps_separated;
        }
        logger.debug('suiteCaseIds: ', suiteCaseIds)
        removedCaseIds = case_ids.filter(item => !suiteCaseIds.includes(item));
        existingCaseIds = case_ids.filter(item => suiteCaseIds.includes(item));
        existingCaseIds.forEach(id => {
            if (customStepsSeparatedMap[id]) {
                existingCustomStepsSeparated[id] = customStepsSeparatedMap[id];
            }
        });
        if (this.tesrailConfigs.use_existing_run.id != 0) {
            runId = await this.tesrailConfigs.use_existing_run.id;
            logger.info(
                `The Run started, utilizing an existing TestRail Run`
                + `with "${runId}" id.`
            );
        } else {
            if (removedCaseIds.length > 0) {
                logger.warn(
                    `The provided TestRail suite does not contain`
                    + ` the following case ids: [${removedCaseIds}]`
                );
            }
            createRunResponse = await this.addRunToTestRail(existingCaseIds)
                .catch((err) => logger.error(errorMessage(err)));
            runId = createRunResponse.id;
            runUrl = createRunResponse.url;
        }
        getTestsResponse = await this.tr_api.getTests(runId);
        logger.debug('tests response length: \n', getTestsResponse.length)
        for (let val of getTestsResponse) {
            // logger.info('val.case_id: ', val.case_id)
            testrailRunCaseIds.push(val.case_id);
        }
        commonIds = testrailRunCaseIds.filter(id => existingCaseIds.includes(id));
        if (this.tesrailConfigs.testRailUpdateInterval != 0
            && !this.tesrailConfigs.updateResultAfterEachCase) {
            this.startScheduler(runId)
        };
    }

    async onTestEnd(test, result) {
        logger.debug('onTestEnd')
        logger.debug('testrailRunCaseIds:\n', testrailRunCaseIds)
        // TODO: another way to check if the test case is in the testrail run
        while (testrailRunCaseIds.length == 0) {
            await setTimeout(10000);
        }
        const status_id = this.tesrailConfigs.status[result.status];
        const case_id = this.utils._formatTitle(test.title);
        if (case_id) {
            const comment = this.setTestComment(result);
            const data = {
                case_id: +case_id[1],
                status_id,
                comment,
                elapsed: this.utils._formatTime(result.duration) || "",
                defects: "",
                version: "",
            };
            this.stepResultComment(result, +case_id[1])
            if (custom_step_results.length > 0) {
                data.custom_step_results = custom_step_results;
                // nullify the custom_step_results array once its data is used
                custom_step_results = [];
            }
            if (!testrailRunCaseIds.includes(+case_id[1])) {
                logger.warn(
                    `Test case with "${+case_id[1]}" id doesn't exist`
                    + ` in TestRail run with "${runId}" id`
                );
            }

            if (testrailRunCaseIds.includes(+case_id[1])) testResults.push(data);
            if (this.tesrailConfigs.updateResultAfterEachCase
                && testrailRunCaseIds.includes(+case_id[1])) {
                await this.tr_api.addResultForCase(runId, +case_id[1], data)
                .catch((err) => {
                    logger.error('Failed to add test result')
                    logger.error(err)
                });
            }
            logger.debug('testResults:\n ', testResults)
        }
    }

    async onEnd(result) {
        logger.debug('onEnd')
        let count = 0;
        let runResult;
        // TODO: another way to check if the test case is in the testrail run
        while (testrailRunCaseIds.length == 0) {
            logger.debug(
                'testrailRunCaseIds: ',
                testrailRunCaseIds,
                ' count: ',
                count
            )
            if (count == 30) { count = 0; break; }
            await setTimeout(1000);
            count++;
        }
        count = 0;
        while (testResults.map(item => item.case_id).length != commonIds.length) {
            if (count == 30) { count = 0; break; }
            await setTimeout(500);
            count++;
        }
        count = 0;
        logger.debug('onEnd result:\n', result)
        // console.table({
        //     'common ids': commonIds,
        //     'testrail run case ids': testrailRunCaseIds,
        // })
        while (this.tesrailConfigs.updateResultAfterEachCase) {
            while (true) {
                logger.debug('test results:\n', testResults)
                if (count == 10) { count = 0; break; }
                runResult = await this.tr_api.getResultsForCase(
                    runId,
                    testResults[testResults.length - 1].case_id
                ).catch((error) => {
                    logger.error(error);
                });
                if (runResult.length !== 0) break;
                count++;
            }
            const lastTestStatusId = testResults[testResults.length - 1].status_id;
            if (runResult[0].status_id == lastTestStatusId || count == 50) break;
            await setTimeout(500);
            count++;
        }
        if (this.tesrailConfigs.testRailUpdateInterval == 0
            && !this.tesrailConfigs.updateResultAfterEachCase) {
            await this.updateTestRailResults(testResults, runId, runUrl);
        }
        global.need_to_stop = true;
        if (copiedTestResults.length != testResults.length &&
            this.tesrailConfigs.testRailUpdateInterval != 0 &&
            !this.tesrailConfigs.updateResultAfterEachCase) {
            await this.updateCurrentResults(runId);
        }
    }

    sanitizeString(str) {
        /*
        removes unwanted whitespaces and bracets,
        and formats the string to a standardized format
        */
        return str.replace(/[\s'"]/g, '').toLowerCase();
    }

    stepResultComment(result, caseId) {
        const testRailCaseSteps = existingCustomStepsSeparated[caseId];
        if (testRailCaseSteps) {
            logger.debug('testRailCaseSteps:\n', testRailCaseSteps)
            const resultSteps = result.steps.filter(step => step.category === 'test.step');
            const stepsDoMatch = testRailCaseSteps.length === resultSteps.length;
            for (let index = 0; index < testRailCaseSteps.length; index++) {
                const testRailStep = testRailCaseSteps[index];
                const step = resultSteps[index];
                let testRailExpected = '';
                let testCaseStatus = null;
                if (stepsDoMatch) {
                    if (this.sanitizeString(step.title) === this.sanitizeString(testRailStep.content)) {
                        testRailExpected = testRailStep.expected;
                    } else {
                        testRailExpected = 'TestRail test step doesn\'t match to the framework step';
                        testCaseStatus = this.tesrailConfigs.status.untested;
                    }
                } else {
                    testRailExpected = 'Test rail test step doesn\'t match to the framework step';
                    testCaseStatus = this.tesrailConfigs.status.untested;
                }
                if (step && step.error != undefined) {
                    let stepError = step.error.message.replace(/\u001b\[\d+m/g, '').split('\n')
                    for (const err of stepError) {
                        if (err.includes('Received')) { actual = err }
                        if (err.includes('Expected')) { expected = err }
                    }
                    stepResult = {
                        "content": testRailStep.content,
                        "expected": testRailExpected + "\n" + expected,
                        "actual": actual,
                        "status_id": testCaseStatus ?? this.tesrailConfigs.status.failed
                    }
                } else {
                    stepResult = {
                        "content": testRailStep.content,
                        "expected": testRailExpected,
                        "status_id": testCaseStatus ?? this.tesrailConfigs.status.passed
                    }
                }
                custom_step_results.push(stepResult)
            }
        } else {
            logger.warn(
                `Test case with "${caseId}" id doesn't have custom steps in TestRail`
            );
        }
    }
}

module.exports = CallerPlaywright;
