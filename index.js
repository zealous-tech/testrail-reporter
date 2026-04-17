const CallerVitest = require("./src/reporters/caller-vitest");
const CallerPlaywright = require("./src/reporters/caller-playwright");
const CallerJest = require("./src/reporters/caller-jest");
const CallerMochaReporter = require("./src/reporters/caller-cypress-mocha");
const process = require("process");
const { fork } = require("child_process");


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

  constructor(globalConfig, reporterOptions, reporterContext) 
  {
    this._caller = new CallerJest();
    this._globalConfig = globalConfig;
    this._options = reporterOptions;
    this._context = reporterContext;
  }
  
  async onTestCaseResult(test, testCaseResult) 
  {
    await this._caller.onTestCaseResult(test, testCaseResult);
  }
    
  async onRunComplete (testContexts, results) 
  {

    await this._caller.onRunComplete(testContexts, results);
  }
}

// =====================================================
// WORKER MODE (TestRail uploader)
// =====================================================
if (process.env.IS_TESTRAIL_WORKER === "true") 
{
  async function runWorker(data) 
  {
    const caller = new CallerMochaReporter();
    for (const r of data.results) 
    {
      await caller.handleTestResult(r);
    }
    await caller.finalizeAndSyncTestRailRun();
  }

  process.on("message", (data) => 
  {
    Promise.resolve()
      .then(() => runWorker(data))
      .then(() => 
      {
        return new Promise((resolve) => setTimeout(resolve, 300));
      })
      .then(() => 
      {
        process.exit(0);
      })
      .catch((err) => 
      {
        throw new Error(`Worker failed: ${err}`);
      });
  });
  return;
}

class MochaTestRailReporter 
{
  constructor(runner) 
  {
    this.results = [];

    runner.on("test end", (test) => 
    {
      this.results.push
      ({
        title: test.title,
        fullTitle: test.fullTitle(),
        state: test.state,
        error: test.err?.message || "",
        duration: test.duration || 0,
      });
    });

    runner.once("end", async () => 
    {
      await new Promise((resolve, reject) => 
      {
        const child = fork(__filename, [], 
        {
          env: 
          {
            ...process.env,
            IS_TESTRAIL_WORKER: "true",
          },
          stdio: "inherit",
        });

        child.on("exit", (code) => 
        {
          resolve();
        });

        child.on("error", reject);
        child.send({ results: this.results });
      });
    });
  }
}

if (process && process.env && process.env.npm_lifecycle_script) {
  if (process.env.npm_lifecycle_script.includes("vitest")) {
    module.exports = VitestTestrailReporter;
  } else if (process.env.npm_lifecycle_script.includes("playwright")) {
    module.exports = PlaywrightTestRailReporter;
  } else if (
    process.env.npm_lifecycle_script.includes("cypress") || 
    process.env.npm_lifecycle_script.includes("mocha")
  ) {
    module.exports = MochaTestRailReporter;
  } else {
    module.exports = JestTestRailReporter;
  }
}
