import TestRail from "@dlenroc/testrail";
import path from "path";
import { green as message, red as error } from "colorette";
import { IResult, ITestrailConfig } from "../lib/interface.ts";
import * as schedule from 'node-schedule';

const DEFAULT_CONFIG_FILENAME = 'testrail.config.ts';




let config: ITestrailConfig;
export const testResults: IResult[] = [];
export const case_ids: number[] = [];
export const runCaseIds: number[] = [];
export const copiedTestResults: IResult[] = [];
const expectedFailures = {} as { [x: number]: boolean };


async function getConfig() {
    try {
        const configPath = path.resolve(process.cwd(), DEFAULT_CONFIG_FILENAME);
        const theConfigObj = await import(configPath);
        config = (theConfigObj.default) as ITestrailConfig
    } catch (err) {
        throw Error("TEST RAILS config failing")
    }
}


if (process.env.npm_lifecycle_script?.includes('vitest')) {
    await (async () => {
        await getConfig();
    })();
} else if (process.env.npm_lifecycle_script?.includes('playwright')) {
    (async () => {
        await getConfig();
    })();
} else {
    throw Error("Unknown Runner!")
}


export class BaseClass {
    protected tesrailConfigs: any = config

    public tr_api = new TestRail({
        host: this.tesrailConfigs.base_url,
        username: this.tesrailConfigs.user,
        password: this.tesrailConfigs.pass,
    });

    public rule = this.tesrailConfigs.testRailUpdateInterval <= 59
        ? `*/${this.tesrailConfigs.testRailUpdateInterval} * * * * *`
        : `*/${Math.round(this.tesrailConfigs.testRailUpdateInterval / 60)} * * * *`;


    addRunToTestRail = async (case_ids: any) => {
        console.log(message("Adding new Run to Test Rail\n"));
        const today = new Date();
        return await this.tr_api.addRun(this.tesrailConfigs.project_id, {
            suite_id: this.tesrailConfigs.suite_id,
            milestone_id: this.tesrailConfigs.create_new_run.milestone_id !== 0 ? this.tesrailConfigs.create_new_run.milestone_id : undefined,
            name: `${this.tesrailConfigs.create_new_run.run_name} ${today.getDate()}.${today.getMonth() + 1
                }.${today.getFullYear()}-${today.getHours()}:${today.getMinutes()}:${today.getSeconds()}`,
            description: "TestRail automatic reporter module",
            include_all: this.tesrailConfigs.create_new_run.include_all,
            case_ids: case_ids
        });
    };

    async updateTestRailResults(testRailResults: IResult[], runId: number) {
        console.log(message("Start adding run results into TestRail\n"), new Date());
        let result: IResult[];
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
                }, [] as IResult[]);
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
                await this.tr_api.getTests(runId).then((res) => {
                    res.forEach((item) => {
                        runCaseIds.push(item.case_id)
                    })
                })
                const filteredResult = result.filter(items => runCaseIds.includes(items.case_id));

                const res = {
                    "results": filteredResult
                }
                await this.tr_api.addResultsForCases(runId, res)
                    .then(() => {
                        console.log('Test result added TestRail successfully!\n', new Date());
                    })
                    .catch((error) => {
                        console.error('Failed to add test result:', error);
                    });

            })
            .catch((err) => console.log(error(err)));
    }

    startScheduler(runId: number) {
        const job = schedule.scheduleJob({ rule: this.rule }, () => {
            this.updateCurrentResults(runId)
            if (global.need_to_stop && job) {
                job.cancel()
            }

        });
    }

    async updateCurrentResults(runId: number) {
        const testRailResults: IResult[] = [];
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

    setTestComment(result: any) {
        if (result.status == "failed" || result.status == "timedOut" || result.status == "interrupted") {
            return "Test Status is " + result.status + " " + result.error?.message?.replace(/\u001b\[\d+m/g, '')
        } else if (result.status == "skipped") {
            return "Test Status is " + result.status
        }
        else {
            return "Test Passed within " + result.duration + " ms"
        }
    }
}