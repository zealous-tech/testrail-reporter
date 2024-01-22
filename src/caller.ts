import TestRail from "@dlenroc/testrail";
import { green as message, red as error, underline, blue } from "colorette";
import path from "path";
import Utils from "./utils.js";
import * as schedule from 'node-schedule';


const DEFAULT_CONFIG_FILENAME = "testrail.config.ts";
let
    base_url,
    user,
    pass,
    project_id,
    suite_id,
    testRailUpdateInterval,
    use_existing_run,
    create_new_run,
    status;

try {
    const configPath = path.resolve(process.cwd(), process.env.TESTRAIL_CONFIG_FILE ?? DEFAULT_CONFIG_FILENAME);
    const theConfigObj = await import(configPath);
    const theConf = theConfigObj.default;

    ({
        base_url,
        user,
        pass,
        project_id,
        suite_id,
        testRailUpdateInterval,
        use_existing_run,
        create_new_run,
        status
    } = theConf);
} catch (err) {
    console.log('TEST RAILS config failing');
    console.log(err)
}
type Result = {
    case_id: number;
    status_id: number;
    comment: string;
    elapsed: string;
    defects: string;
    version: string;
};

const testResults: Result[] = [];
const copiedTestResults: Result[] = [];
const startList = {} as { [x: number]: number };
let case_ids: number[] = [];
let need_to_stop = false;
const rule = testRailUpdateInterval <= 59
    ? `*/${testRailUpdateInterval} * * * * *`
    : `*/${Math.round(testRailUpdateInterval / 60)} * * * *`;
let files_count = 0
let paths_count = 0

const expectedFailures = {} as { [x: number]: boolean };

let runId = 0;
let run: any;

class Caller {
    readonly tr_api = new TestRail({
        host: base_url,
        username: user,
        password: pass,
    });
    readonly utils = new Utils();


    onInit() {
        console.log('The Run Started!', new Date());
    }

    onPathsCollected(paths) {
        paths_count = paths.length
    }

    onCollected(file) {
        files_count++
        this.processStartList(file);
        if (files_count == paths_count) {
            this.createRun()
            if (testRailUpdateInterval != 0) this.startScheduler()
        }
    }

    onTaskUpdate(packs) {
        packs.forEach((element) => {
            const testRunId = element[0];
            const case_id = startList[testRunId];
            if (case_id && element[1].duration >= 0) {
                const status_id = status[element[1].state];
                const comment =
                    status_id === status.fail
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

    onFinished(packs) {
        if (testRailUpdateInterval == 0) {
            this.updateTestRailResults(testResults)
        }
        need_to_stop = true;
    }

    addRunToTestRail = () => {
        console.log(message("Adding new Run to Test Rail\n"));
        const today = new Date();
        return this.tr_api.addRun(project_id, {
            suite_id,
            milestone_id: create_new_run.milestone_id !== 0 ? create_new_run.milestone_id : undefined,
            name: `${create_new_run.run_name} ${today.getDate()}.${today.getMonth() + 1
                }.${today.getFullYear()}`,
            description: "TestRail automatic reporter module",
            include_all: create_new_run.include_all,
            case_ids: case_ids
        });
    };

    updateTestRailResults(testRailResults: Result[]) {
        console.log(message("Start adding run results into TestRail\n"), new Date());
        let result: Result[];
        this.tr_api
            .getCases(project_id, { suite_id })
            .then((tests) => {
                tests.forEach(({ id, custom_bug_ids }) => {
                    expectedFailures[id] = !!custom_bug_ids;
                });
                result = testRailResults.reduce((acc, item) => {
                    if (expectedFailures[item.case_id] != undefined) {
                        let status_id = item.status_id;
                        if (expectedFailures[item.case_id] === true) {
                            if (status_id === status.pass) {
                                status_id = status.fixed;
                            }
                            if (status_id === status.fail) {
                                status_id = status.expFail;
                            }
                        }
                        return [...acc, { ...item, status_id }];
                    } else {
                        return acc;
                    }
                }, [] as Result[]);
            })
            .then(() => {
                let res = {
                    "results": result
                }
                this.tr_api.addResultsForCases(runId, res)
                    .then(() => {
                        console.log('Test result added TestRail successfully!\n', new Date());
                        console.log(
                            "See Results: " +
                            blue(underline(`${base_url}/index.php?/runs/view/${runId}\n`))
                        );
                    })
                    .catch((error) => {
                        console.error('Failed to add test result:', error);
                    });

            })
            .catch((err) => console.log(error(err)));
    }

    processStartList(arr) {
        for (const element of arr) {
            if (!element.name.match(/[@C][?\d]{1,6}$/gm) && element.tasks) {
                this.processStartList(element.tasks);
            } else {
                const case_id = this.utils._formatTitle(element.name);
                if (case_id != null) case_ids.push(parseInt(case_id[1]))
                if (element.mode === "skip") {
                    if (case_id && case_id[1]) {
                        startList[element.id] = +case_id[1];
                    }
                    const data = {
                        case_id: case_id ? +case_id[1] : 0,
                        status_id: status.skipped,
                        comment: "This test is skipped",
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

    createRun() {
        if (use_existing_run.id != 0) {
            runId = use_existing_run.id
        } else {
            if (create_new_run.single_run_per_day) {
                this.tr_api
                    .getRuns(project_id, { suite_id })
                    .then((results) => {
                        const today = new Date();
                        run = results.find(
                            (runs_el) =>
                                runs_el.name ==
                                `${create_new_run.run_name} ${today.getDate()}.${today.getMonth() + 1
                                }.${today.getFullYear()}`
                        );
                    })
                    .then(() => {
                        if (!run) {
                            this.addRunToTestRail().then(({ id }) => {
                                runId = id;
                            });
                        } else {
                            runId = run.id;
                        }
                    })
                    .catch((err) => console.log(error(err)));
            } else {
                this.addRunToTestRail()
                    .then(({ id }) => {
                        runId = id;
                    })
                    .catch((err) => console.log(error(err)));
            }
        }
    }

    startScheduler() {
        const job = schedule.scheduleJob({ rule: rule }, () => {
            console.log('The answer to life, the universe, and everything!', new Date());
            let testRailResults: Result[] = [];
            for (const result of testResults) {
                // Check if the item does not exist in copiedTestResults
                const existsInCopied = copiedTestResults.some((item) => item.case_id === result.case_id);

                if (!existsInCopied) {
                    // If it doesn't exist, append to copiedTestResults and testRailResults
                    copiedTestResults.push(result);
                    testRailResults.push(result);
                }
            }
            if (testRailResults.length > 0) {
                this.updateTestRailResults(testRailResults);
                if (need_to_stop) {
                    job.cancel()
                }
            }

        });
    }
}

export default Caller;