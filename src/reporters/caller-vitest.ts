import { blue, red as error, underline } from "colorette";
import Utils from "../utils.js";
import { setTimeout } from 'timers/promises';
import { BaseClass, testResults, case_ids } from "../base.ts";


const startList = {} as { [x: number]: number };
global.need_to_stop = false;
let files_count = 0
let paths_count = 0
global.runId = 0;

class CallerVitest extends BaseClass {
    readonly utils = new Utils();

    onInit() {
        console.log('TestRail Reporter Log: ' + "The reporter started successfully!")
    }

    onPathsCollected(paths) {
        paths_count = paths.length
    }

    async onCollected(file) {
        files_count++
        this.processStartList(file);
        if (files_count == paths_count) {
            if (this.tesrailConfigs.use_existing_run.id != 0) {
                global.runId = this.tesrailConfigs.use_existing_run.id
                await this.tr_api.getRun(global.runId).then(() => {
                    console.log('TestRail Reporter Log: ' + "The runId is a valid test run id!!")
                })
                console.log('TestRail Reporter Log: ' + 'TestRail Reporter Log: ' + `The Run started, utilizing an existing run in TestRail with the ID=${global.runId}.`);
            } else {
                await this.addRunToTestRail(case_ids)
                    .then(({ id }) => {
                        global.runId = id;
                    })
                    .catch((err) => console.log('TestRail Reporter Log: ' + error(err)));
            }
            if (this.tesrailConfigs.testRailUpdateInterval != 0) this.startScheduler(global.runId)
        }
    }

    onTaskUpdate(packs) {
        packs.forEach((element) => {
            const testRunId = element[0];
            const case_id = startList[testRunId];
            if (case_id && element[1].duration >= 0) {
                if (element[1].state == 'pass') element[1].state = 'passed'
                if (element[1].state == 'fail') element[1].state = 'failed'
                const status_id = this.tesrailConfigs.status[element[1].state];
                const comment =
                    status_id === this.tesrailConfigs.status.failed
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

    async onFinished(packs) {
        if (this.tesrailConfigs.testRailUpdateInterval == 0) {
            while (global.runId === 0) {
                await setTimeout(100)
            }
            await this.updateTestRailResults(testResults, global.runId)
        }
        global.need_to_stop = true;
        console.log('TestRail Reporter Log: ' +
            "See Results: " +
            blue(underline(`${this.tesrailConfigs.base_url}/index.php?/runs/view/${global.runId}\n`))
        );
    }

    processStartList(arr) {
        for (const element of arr) {
            if (!element.name.match(/[@C][?\d]{1,8}$/gm) && element.tasks) {
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
                        status_id: this.tesrailConfigs.status.skipped,
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
}

export default CallerVitest;