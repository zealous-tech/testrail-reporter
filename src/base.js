const TestRail = require("@dlenroc/testrail");
const path = require("path");
const { green: message, red: errorMessage } = require("colorette");
const schedule = require('node-schedule');

const DEFAULT_CONFIG_FILENAME = 'testrail.config.js';
const configPath = path.resolve(process.cwd(), DEFAULT_CONFIG_FILENAME);
const { base_url, user, pass, project_id, suite_id, testRailUpdateInterval, updateResultAfterEachCase, use_existing_run, create_new_run, status } = require(configPath);
const testResults = [];
const case_ids = [];
const copiedTestResults = [];
const expectedFailures = {};


class BaseClass {
    constructor() {
        this.tesrailConfigs = {
            base_url: base_url,
            user: user,
            pass: pass,
            project_id: project_id,
            suite_id: suite_id,
            testRailUpdateInterval: testRailUpdateInterval,
            updateResultAfterEachCase: updateResultAfterEachCase,
            use_existing_run: use_existing_run,
            create_new_run: create_new_run,
            status: status
        };

        this.tr_api = new TestRail({
            host: this.tesrailConfigs.base_url,
            username: this.tesrailConfigs.user,
            password: this.tesrailConfigs.pass,
        });

        this.rule = this.tesrailConfigs.testRailUpdateInterval <= 59
            ? `*/${this.tesrailConfigs.testRailUpdateInterval} * * * * *`
            : `*/${Math.round(this.tesrailConfigs.testRailUpdateInterval / 60)} * * * *`;
    }

    addRunToTestRail = async (case_ids) => {
        console.log(message("TestRail Reporter Log: " + "Adding new Run to Test Rail\n"));
        const today = new Date();
        const seconds = today.getSeconds() < 10 ? `0${today.getSeconds()}` : today.getSeconds();
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const monthAbbreviation = monthNames[today.getMonth()];
        return await this.tr_api.addRun(this.tesrailConfigs.project_id, {
            suite_id: this.tesrailConfigs.suite_id,
            milestone_id: this.tesrailConfigs.create_new_run.milestone_id !== 0 ? this.tesrailConfigs.create_new_run.milestone_id : undefined,
            name: `${this.tesrailConfigs.create_new_run.run_name} ${today.getDate()}/${monthAbbreviation
                }/${today.getFullYear()}_${today.getHours()}:${today.getMinutes()}:${seconds}`,
            description: "TestRail automatic reporter module",
            include_all: this.tesrailConfigs.create_new_run.include_all,
            case_ids: case_ids
        });
    };

    async updateTestRailResults(testRailResults, runId) {
        console.log(message("TestRail Reporter Log: " + "Start adding run results into TestRail\n"), new Date());
        let result;
        await this.tr_api
            .getCases(this.tesrailConfigs.project_id, { suite_id: this.tesrailConfigs.suite_id })
            .then((tests) => {
                tests.forEach(({ id, custom_bug_ids }) => {
                    expectedFailures[id] = !!custom_bug_ids;
                });
                result = testRailResults.reduce((acc, item) => {
                    if (expectedFailures[item.case_id] != undefined) {
                        let status_id = item.status_id;
                        if (expectedFailures[item.case_id] === true) {
                            if (status_id === this.tesrailConfigs.status.pass) {
                                status_id = this.tesrailConfigs.status.fixed;
                            }
                            if (status_id === this.tesrailConfigs.status.fail) {
                                status_id = this.tesrailConfigs.status.expFail;
                            }
                        }
                        return [...acc, { ...item, status_id }];
                    } else {
                        return acc;
                    }
                }, []);
            })
            .then(async () => {
                if (this.tesrailConfigs.use_existing_run.id != 0) {
                    await this.tr_api.getResultsForRun(this.tesrailConfigs.use_existing_run.id).then((results) => {
                        results.forEach((res) => {
                            if (res.status_id != this.tesrailConfigs.status.untested) {
                                result = result.filter(testCase => testCase.status_id !== this.tesrailConfigs.status.skipped);
                            }
                        })
                    })
                }
                const res = {
                    "results": result
                }
                await this.tr_api.addResultsForCases(runId, res)
                    .then(() => {
                        console.log("TestRail Reporter Log: " + 'Test result added TestRail successfully!\n', new Date());
                    })
                    .catch((error) => {
                        console.log(errorMessage("TestRail Reporter Log: " + 'Failed to add test result:'), error);
                    });

            })
            .catch((err) => console.log(errorMessage(err)));
    }

    startScheduler(runId) {
        const job = schedule.scheduleJob({ rule: this.rule }, () => {
            this.updateCurrentResults(runId)
            if (global.need_to_stop && job) {
                job.cancel()
            }
        });
    }

    async updateCurrentResults(runId) {
        const testRailResults = [];
        for (const result of testResults) {
            const existsInCopied = copiedTestResults.some((item) => item.case_id === result.case_id);
            if (!existsInCopied) {
                copiedTestResults.push(result);
                testRailResults.push(result);
            }
        }
        if (testRailResults.length > 0) {
            await this.updateTestRailResults(testRailResults, runId);
        }
    }

    setTestComment(result) {
        if (result.status == "failed" || result.status == "timedOut" || result.status == "interrupted") {
            return "Test Status is " + result.status + " " + result.error?.message?.replace(/\u001b\[\d+m/g, '')
        } else if (result.status == "skipped") {
            return "This test was marked as 'Skipped'."
        }
        else {
            return "Test Passed within " + result.duration + " ms"
        }
    }
}

module.exports = { BaseClass, testResults, case_ids, copiedTestResults };
