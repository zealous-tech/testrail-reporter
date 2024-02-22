import CallerVitest from "./src/reporters/caller-vitest";
import CallerPlaywright from "./src/reporters/caller-playwright";
import type {
    FullConfig, FullResult, Suite, TestCase, TestResult
} from '@playwright/test/reporter';
import * as process from 'process';


class VitestTestrailReporter {
    readonly caller = new CallerVitest();

    onInit() {
        this.caller.onInit();
    }

    onPathsCollected(paths: any) {
        this.caller.onPathsCollected(paths);
    }

    onCollected(file: any) {
        this.caller.onCollected(file);
    }

    onTaskUpdate(packs: any) {
        this.caller.onTaskUpdate(packs);
    }

    onFinished(packs: any) {
        this.caller.onFinished(packs);
    }
}


class PlaywrightTestRailReporter {
    readonly caller = new CallerPlaywright();

    async onBegin(config: FullConfig, suite: Suite) {
        await this.caller.onBegin(config, suite);
    }

    async onTestEnd(test: TestCase, result: TestResult) {
        await this.caller.onTestEnd(test, result);
    }

    async onEnd(result: FullResult) {
        await this.caller.onEnd(result);
    }
}


class JestTestRailReporter {

    onRunStart() {
    }

    onTestStart() {
    }

    onTestResult() {
    }

    onRunComplete() {
    }
}


if (process && process.env && process.env.npm_lifecycle_script) {
    if (process.env.npm_lifecycle_script.includes('vitest')) {
        module.exports = VitestTestrailReporter;
    }
    else if (process.env.npm_lifecycle_script.includes('playwright')) {
        module.exports = PlaywrightTestRailReporter;
    } else {
        module.exports = JestTestRailReporter;
    }
}
