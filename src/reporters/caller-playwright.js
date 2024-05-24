const Utils = require("../utils.js");
const process = require('process');
const getLogger = require('../logger.js');
const logger = getLogger();

const BaseClass = require("../base.js").BaseClass;
const testResults = require("../base.js").testResults;
const case_ids = require("../base.js").case_ids;
const copiedTestResults = require("../base.js").copiedTestResults;
const setTimeout = require('timers/promises').setTimeout;

// TODO: fix naming
global.need_to_stop = false;
let runId = 0;
let commonIds = [];
let removedCaseIds = [];
let existingCaseIds = [];
let testrailRunCaseIds = [];
// case ids listed in provided suite of TestRail
let trCaseIds = [];
let custom_step_results = [];
let createRunResponse;
let stepResult;
let actual;
let expected;
// TODO: fix naming and usage
let existingCustomStepsSeparated = {};

/* timeouts */
// onEnd timeout to check if all the test cases are updated in the TestRail run
// TODO: make it configurable
let allCasesUpdateTimeout = 30000;
// delay between each check action
let minDelay = 1000;

/* flags for hooks */
let onBeginCompleted = false;
// amount of all test cases that are currently running
let runningTestsAmount = 0;
let completedTestsAmount = 0;

// Variable representing all test cases that are currently running
let testQueue = [];
// Variable representing the tests amount updated in the TestRail run
// if the updateResultAfterEachCase is set to true.
// This should be equal to the testResults array length once the test run ends.
let updatedTestsAmount = 0;


async function waitForBegin() {
    // wait for the onBegin hook to complete
    while (!onBeginCompleted) {
        await setTimeout(minDelay);
    }
}

async function waitForTest(testId) {
    // wait for the test to be started
    while (!testQueue.includes(testId)) {
        await setTimeout(minDelay);
    }
}

async function waitForAllTestsEnd() {
    // wait for all the tests to be completed
    while (completedTestsAmount != runningTestsAmount) {
        await setTimeout(minDelay);
    }
}

class CallerPlaywright extends BaseClass {
    constructor() {
        super();
        this.utils = new Utils();
    }

    async onBegin(config, suite) {
        /*
         * The onBegin method is called before the test run starts.
         * It is used to get the test cases from the TestRail suite
         * and create a new TestRail run if needed.
         * */
        logger.debug('onBegin')
        let customStepsSeparatedMap = {};
        logger.info('The reporter started successfully');
        runningTestsAmount = suite.allTests().length;
        for (const val of suite.allTests()) {
            const case_details = this.utils._formatTitle(val.title);
            // logger.error('case details:\n', val.title)
            if (case_details != null) case_ids.push(parseInt(case_details[1]));
        }
        if (case_ids.length == 0) {
            logger.warn('No tests found marked for TestRail reporting.')
            // process.exit(1);
        }
        logger.info('Found these test case ids marked for TestRun: ', case_ids)
        // runningTestsAmount = case_ids.length;
        let getCasesResponse = await this.tr_api.getCases(
            this.tesrailConfigs.project_id,
            { suite_id: this.tesrailConfigs.suite_id }
        )
            .catch((err) => {
                const configProjectId = this.tesrailConfigs.project_id;
                const configSuiteId = this.tesrailConfigs.suite_id;
                logger.error(
                    `Failed to get test cases from project by`
                    + ` "${configProjectId}" id`
                    + ` and suite by "${configSuiteId}" id.`
                    + ` \nPlease check your TestRail configuration.`
                )
                logger.error(err);
                process.exit(1);
            });
        for (let val of getCasesResponse) {
            const testCaseId = val.id;
            trCaseIds.push(testCaseId);
            // await this.tr_api.getCaseFields();
            customStepsSeparatedMap[testCaseId] = await val.custom_steps_separated;
        }
        logger.debug('suiteCaseIds: ', trCaseIds)
        removedCaseIds = case_ids.filter(item => !trCaseIds.includes(item));
        existingCaseIds = case_ids.filter(item => trCaseIds.includes(item));
        existingCaseIds.forEach(id => {
            if (customStepsSeparatedMap[id]) {
                existingCustomStepsSeparated[id] = customStepsSeparatedMap[id];
            }
        });
        this.validateSuiteTestsMatching();
        if (this.tesrailConfigs.use_existing_run.id != 0) {
            runId = await this.tesrailConfigs.use_existing_run.id;
            logger.info(
                `The Run started, utilizing an existing TestRail Run`
                + ` with "${runId}" id.`
            );
        } else {
            if (removedCaseIds.length > 0) {
                logger.warn(
                    `The provided TestRail suite does not contain`
                    + ` the following case ids: [${removedCaseIds}]`
                );
            }
            createRunResponse = await this.addRunToTestRail(existingCaseIds)
                .catch((err) => logger.error(err));
            runId = createRunResponse.id;
            this.runURL = createRunResponse.url;
            this.logRunURL()
        }
        let getTestsResponse = await this.tr_api.getTests(runId);
        testrailRunCaseIds = getTestsResponse.map(val => val.case_id);
        commonIds = testrailRunCaseIds.filter(id => existingCaseIds.includes(id));
        if (this.tesrailConfigs.testRailUpdateInterval != 0
            && !this.tesrailConfigs.updateResultAfterEachCase) {
            this.startScheduler(runId)
        };
        onBeginCompleted = true;
        logger.debug('commonIds: ', commonIds)
        logger.debug('onBegin end\n\n')
    }

    async onTestBegin(test) {
        /*
         * The onTestBegin method is called before each test case starts.
         * It is used to add the test case id to the testrailRunCaseIds array.
         * */

        await waitForBegin();
        logger.debug('onTestBegin: ', test.title)
        testQueue.push(test.id);
    }

    async onTestEnd(test, result) {
        /*
         * The onTestEnd method is called after each test case ends.
         * It is used to add the test results to the testResults array.
         * */
        await waitForBegin();
        await waitForTest(test.id);
        logger.debug('onTestEnd: ', test.title)

        const case_id = this.utils._formatTitle(test.title);
        if (case_id) {
            const status_id = this.tesrailConfigs.status[result.status];
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
                    + ` in TestRail run with "${runId}" id.`
                    + ` Please check your TestRail run/suite.`
                );
            }

            if (testrailRunCaseIds.includes(+case_id[1])) testResults.push(data);
            if (this.tesrailConfigs.updateResultAfterEachCase
                && testrailRunCaseIds.includes(+case_id[1])) {
                let apiRes = await this.tr_api.addResultForCase(
                    runId,
                    +case_id[1],
                    data
                )
                .catch((err) => {
                    logger.error('Failed to add test result')
                    logger.error(err)
                });
                if (apiRes != null && apiRes.id != undefined
                    && apiRes.hasOwnProperty('id')) {
                    updatedTestsAmount+=1;
                }
            }
        }
        completedTestsAmount += 1;
        // remove the test id from the testQueue
        testQueue = testQueue.filter(item => item !== test.id);
    }

    async onEnd(result) {
        /*
         * The onEnd method is called after the test run ends.
         * I.e. after all the test cases have been executed.
         * It is used to update the test results in the TestRail run.
         *
         * NOTES:
         * - this hook is called only once after all the tests are done,
         *   but in some cases, it might be called when the last tets reult
         *   is not yet updated in the TestRail run. Thus, the reporter
         *   should wait based on conditions:
         *      - there is at least one test result in the testResults array
         *      - the last test result is updated in the TestRail run
         *   After the conditions are met, the reporter can update the
         *   test results in the TestRail run.
         * */

        async function waitForAllUpdates(self) {
            if (self.tesrailConfigs.updateResultAfterEachCase) {
                let timeout = 0;
                while (updatedTestsAmount != commonIds.length) {
                    if (timeout == allCasesUpdateTimeout) {
                        logger.error(
                            'There is a problem with the test execution.'
                            + ' The test execution is taking too long.'
                            + ' Make sure there is no internet connection issue.'
                            + ' Exiting...'
                        )
                        break
                    }
                    timeout += minDelay;
                    await setTimeout(minDelay);
                }
            }
        }
        // need to wait for the onBegin hook to complete because onEnd hook
        // can be called before the onBegin hook is completed
        await waitForBegin();
        // need to wait for all the test cases to be executed
        await waitForAllTestsEnd()
        // if upadteResultAfterEachCase is set to true
        // need to wait for all the test cases to be updated in the TestRail run
        await waitForAllUpdates(this);

        logger.debug('onEnd\n\n')

        if (this.tesrailConfigs.testRailUpdateInterval == 0
            && !this.tesrailConfigs.updateResultAfterEachCase) {
            await this.updateTestRailResults(testResults, runId);
        }
        global.need_to_stop = true;
        if (copiedTestResults.length != testResults.length &&
            this.tesrailConfigs.testRailUpdateInterval != 0 &&
            !this.tesrailConfigs.updateResultAfterEachCase) {
            await this.updateCurrentResults(runId);
        }
        this.logRunURL()
    }

    validateSuiteTestsMatching() {
        /*
         * If the test case ids are not found in the TestRail suite,
         * or the test case ids are not provided,
         * the reporter will not exit, but will inform the user about it.
         * */
        if (removedCaseIds == case_ids || existingCaseIds.length == 0) {
            logger.warn(
                `The provided TestRail suite does not contain`
                + ` any of the provided case ids.`
            );
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
            // logger.debug(
            //     `TestRail case steps:\n${JSON.stringify(testRailCaseSteps, null, 2)}\n`
            // );
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
