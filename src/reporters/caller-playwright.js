const { green: message, red: errorMessage } = require("colorette");
const Utils = require("../utils.js");
const process = require('process');

const BaseClass = require("../base.js").BaseClass;
const testResults = require("../base.js").testResults;
const case_ids = require("../base.js").case_ids;
const copiedTestResults = require("../base.js").copiedTestResults;
const setTimeout = require('timers/promises').setTimeout;

global.need_to_stop = false;
let runId = 0;
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
        let customStepsSeparatedMap = {};
        console.log(message('TestRail Reporter Log: ' + "The reporter started successfully!"));
            for (const val of suite.allTests()) {
                const case_id = this.utils._formatTitle(val.title);
                if (case_id != null) case_ids.push(parseInt(case_id[1]));
            }
        getCasesResponse = await this.tr_api.getCases(this.tesrailConfigs.project_id, { suite_id: this.tesrailConfigs.suite_id })
            .catch((err) => {
                console.log(errorMessage('TestRail Reporter Log: ' + `Failed to get test cases from project project_id=${this.tesrailConfigs.project_id} and suite suite_id=${this.tesrailConfigs.suite_id}: `) + err)
            });
        for (let val of getCasesResponse) {
            const testCaseId = await val.id;
            suiteCaseIds.push(testCaseId);
            let totalContent = await this.tr_api.getCaseFields();
            customStepsSeparatedMap[testCaseId] = await val.custom_steps_separated;
        }
        removedCaseIds = case_ids.filter(item => !suiteCaseIds.includes(item));
        existingCaseIds = case_ids.filter(item => suiteCaseIds.includes(item));
        existingCaseIds.forEach(id => {
            if (customStepsSeparatedMap[id]) {
                existingCustomStepsSeparated[id] = customStepsSeparatedMap[id];                
            }
        });
        if (this.tesrailConfigs.use_existing_run.id != 0) {
            runId = await this.tesrailConfigs.use_existing_run.id;
            console.log(message('TestRail Reporter Log: ' + `The Run started, utilizing an existing run in TestRail with the ID=${runId}.`));
        } else {
            if (removedCaseIds.length > 0) console.log(errorMessage('TestRail Reporter Log: ' + `The provided TestRail suite does not contain the following case_ids: ` + `[${removedCaseIds}]`));
            createRunResponse = await this.addRunToTestRail(existingCaseIds)
                .catch((err) => console.log(errorMessage('TestRail Reporter Log: ') + errorMessage(err)));
            runId = await createRunResponse.id;
        }
        getTestsResponse = await this.tr_api.getTests(runId);
        for (let val of getTestsResponse) {
            testrailRunCaseIds.push(await val.case_id);
        }
        commonIds = testrailRunCaseIds.filter(id => existingCaseIds.includes(id));
        if (this.tesrailConfigs.testRailUpdateInterval != 0 && !this.tesrailConfigs.updateResultAfterEachCase) this.startScheduler(runId);
    }

    async onTestEnd(test, result) {
        custom_step_results = [];
        while (testrailRunCaseIds.length == 0) {
            await setTimeout(300);
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
            this.stepResultComment(result,  +case_id[1])
            if (custom_step_results.length > 0) data.custom_step_results = custom_step_results;
            if (!testrailRunCaseIds.includes(+case_id[1])) console.log(errorMessage('TestRail Reporter Log: ' + `Test case with id=${+case_id[1]} doen't exist in TestRail run with id=${runId}`));
            if (testrailRunCaseIds.includes(+case_id[1])) testResults.push(data);
            if (this.tesrailConfigs.updateResultAfterEachCase && testrailRunCaseIds.includes(+case_id[1])) await this.tr_api.addResultForCase(runId, +case_id[1], data).catch((err) => {
                console.log(errorMessage('TestRail Reporter Log: ' + 'Failed to add test result: ') + err);
            });
        }
    }

    async onEnd(result) {
        let count = 0;
        let runResult;
        while (testrailRunCaseIds.length == 0) {
            if (count == 30) { count = 0; break; }
            await setTimeout(500);
            count++;
        }
        count = 0;
        while (testResults.map(item => item.case_id).length != commonIds.length) {
            if (count == 30) { count = 0; break; }
            await setTimeout(500);
            count++;
        }
        count = 0;
        while (this.tesrailConfigs.updateResultAfterEachCase) {
            while (true) {
                if (count == 10) { count = 0; break; }
                runResult = await this.tr_api.getResultsForCase(runId, testResults[testResults.length - 1].case_id).catch((error) => {
                    console.log(errorMessage(error));
                });
                if (runResult.length !== 0) break;
                count++;
            }
            if (runResult[0].status_id == testResults[testResults.length - 1].status_id || count == 50) break;
            await setTimeout(500);
            count++;
        }
        if (this.tesrailConfigs.testRailUpdateInterval == 0 && !this.tesrailConfigs.updateResultAfterEachCase) {
            await this.updateTestRailResults(testResults, runId);
        }
        global.need_to_stop = true;
        if (copiedTestResults.length != testResults.length &&
            this.tesrailConfigs.testRailUpdateInterval != 0 &&
            !this.tesrailConfigs.updateResultAfterEachCase) {
            await this.updateCurrentResults(runId);
        }
    }

    removeWhitespacesAndBrackets(str) {
        return str.replace(/[\s'"]/g, '').toLowerCase();
    }

    stepResultComment(result, caseId) {
        const testRailCaseSteps = existingCustomStepsSeparated[caseId];
        const resultSteps = result.steps.filter(step => step.category === 'test.step');
        const stepsDoMatch = testRailCaseSteps.length === resultSteps.length;
        for (let index = 0; index < testRailCaseSteps.length; index++) {
            const testRailStep = testRailCaseSteps[index];
            const step = resultSteps[index];
            let testRailExpected = '';
            let testCaseStatus = null;
            if (stepsDoMatch) {
                if (this.removeWhitespacesAndBrackets(step.title) === this.removeWhitespacesAndBrackets(testRailStep.content)) {
                    testRailExpected = testRailStep.expected;
                } else {
                    testRailExpected = 'Test rail test step doesn\'t match to the framework step';
                    testCaseStatus = this.tesrailConfigs.status.untested;
                }
            } else {
                testRailExpected = 'The number of test steps don\'t match';
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
    }
}

module.exports = CallerPlaywright;