const CallerVitest = require("./src/reporters/caller-vitest");
const CallerPlaywright = require("./src/reporters/caller-playwright");
const process = require("process");

class VitestTestrailReporter {
  constructor() {
    this.caller = new CallerVitest();
  }

  async onInit() 
  {
    await this.caller.onInit();
  }

  async onTestSuiteReady (testSuite) 
  {
    await this.caller.onTestSuiteReady(testSuite);  
  }

  async onTestCaseResult(testCase)
  {   
    await this.caller.onTestCaseResult(testCase);
  }  

  async onTestRunEnd(testModules, unhandledErrors, reason)
  {
    await this.caller.onTestRunEnd(testModules, unhandledErrors, reason);
  }
}

class PlaywrightTestRailReporter {
  constructor() {
    this.caller = new CallerPlaywright();
  }

  async onBegin(config, suite) {
    await this.caller.onBegin(config, suite);
  }

  async onTestBegin(test) {
    await this.caller.onTestBegin(test);
  }

  async onTestEnd(test, result) {
    await this.caller.onTestEnd(test, result);
  }

  async onEnd(result) {
    await this.caller.onEnd(result);
  }
}

class JestTestRailReporter {
  onRunStart() {}

  onTestStart() {}

  onTestResult() {}

  onRunComplete() {}
}

if (process && process.env && process.env.npm_lifecycle_script) {
  if (process.env.npm_lifecycle_script.includes("vitest")) {
    module.exports = VitestTestrailReporter;
  } else if (process.env.npm_lifecycle_script.includes("playwright")) {
    module.exports = PlaywrightTestRailReporter;
  } else {
    module.exports = JestTestRailReporter;
  }
}
