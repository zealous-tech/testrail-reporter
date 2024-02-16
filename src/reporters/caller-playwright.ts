import { red as error } from "colorette";
import Utils from "../utils.js";
import type {
    FullConfig, FullResult, Suite, TestCase, TestResult
} from '@playwright/test/reporter';
import { BaseClass, testResults, case_ids, copiedTestResults } from "../base.ts";
import { setTimeout } from 'timers/promises';


global.runId = 0;
global.need_to_stop = false;

class CallerPlaywright extends BaseClass {
    readonly utils = new Utils();

    async onBegin(config: FullConfig, suite: Suite) {
        for (const val of suite.allTests()) {
            const case_id = this.utils._formatTitle(val.title);
            if (case_id != null) case_ids.push(parseInt(case_id[1]));
        }
        if (this.tesrailConfigs.use_existing_run.id != 0) {
            global.runId = this.tesrailConfigs.use_existing_run.id
            console.log(`The Run started, utilizing an existing run in TestRail with the ID=${global.runId}.`);
        } else {
            await this.addRunToTestRail(case_ids)
                .then(({ id }) => {
                    global.runId = id;
                })
                .catch((err) => console.log(error(err)));
        }
        if (this.tesrailConfigs.testRailUpdateInterval != 0 && !this.tesrailConfigs.updateResultAfterEachCase) this.startScheduler(global.runId)
    }

    async onTestEnd(test: TestCase, result: TestResult) {
        console.log(`Test case finished: ${test.title}: ${result.status}`);
        const status_id = this.tesrailConfigs.status[result.status];
        const case_id = this.utils._formatTitle(test.title);
        if (case_id) {
            const comment = this.setTestComment(result)
            const data = {
                case_id: +case_id[1],
                status_id,
                comment,
                elapsed: this.utils._formatTime(result.duration) || "",
                defects: "",
                version: "",
            };
            testResults.push(data);
            while (global.runId === 0) {
                await setTimeout(100)
            }
            if (this.tesrailConfigs.updateResultAfterEachCase) await this.tr_api.addResultForCase(global.runId, +case_id[1], data).catch((error) => {
                console.error('Failed to add test result:', error);
            });
        }
    }

    async onEnd(result: FullResult): Promise<void> {
        while (true && this.tesrailConfigs.updateResultAfterEachCase) {
            const runResult = await this.tr_api.getResultsForCase(global.runId, testResults[testResults.length - 1].case_id)
            if (runResult[0].status_id == testResults[testResults.length - 1].status_id) break
            await setTimeout(500)
        }
        while (global.runId === 0) {
            await setTimeout(100)
        }
        if (this.tesrailConfigs.testRailUpdateInterval == 0 && !this.tesrailConfigs.updateResultAfterEachCase) {
            await this.updateTestRailResults(testResults, global.runId)
        }
        global.need_to_stop = true;
        if (copiedTestResults.length != testResults.length &&
            this.tesrailConfigs.testRailUpdateInterval != 0 &&
            !this.tesrailConfigs.updateResultAfterEachCase) {
            await this.updateCurrentResults(global.runId)
        }
    }
}


export default CallerPlaywright;