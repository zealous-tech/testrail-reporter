const CallerVitest = require("./src/reporters/caller-vitest");
const CallerPlaywright = require("./src/reporters/caller-playwright");
const process = require('process');

class VitestTestrailReporter {
    constructor() {
        this.caller = new CallerVitest();
    }

    onInit() {
        this.caller.onInit();
    }

    onPathsCollected(paths) {
        this.caller.onPathsCollected(paths);
    }

    onCollected(file) {
        this.caller.onCollected(file);
    }

    onTaskUpdate(packs) {
        this.caller.onTaskUpdate(packs);
    }

    onFinished(packs) {
        this.caller.onFinished(packs);
    }
}

class PlaywrightTestRailReporter {
    constructor() {
        this.caller = new CallerPlaywright();
    }

    async onBegin(config, suite) {
        await this.caller.onBegin(config, suite);
    }

    async onTestEnd(test, result) {
        await this.caller.onTestEnd(test, result);
    }

    async onEnd(result) {
        await this.caller.onEnd(result);
    }
}

class JestTestRailReporter {
    onRunStart() { }

    onTestStart() { }

    onTestResult() { }

    onRunComplete() { }
}

if (process && process.env && process.env.npm_lifecycle_script) {
    if (process.env.npm_lifecycle_script.includes('vitest')) {
        module.exports = VitestTestrailReporter;
    } else if (process.env.npm_lifecycle_script.includes('playwright')) {
        module.exports = PlaywrightTestRailReporter;
    } else {
        module.exports = JestTestRailReporter;
    }
}
