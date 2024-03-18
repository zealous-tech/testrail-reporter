[![Version](https://img.shields.io/badge/version-1.0.0-green)](https://semver.org)
[![Licence](https://img.shields.io/badge/Licence-MIT-green)](https://github.com/zealous-tech/testrail-reporter/blob/main/LICENSE)
[![Node](https://img.shields.io/badge/node->=10.0.0-coral)](https://github.com/zealous-tech/testrail-reporter/blob/main/package.json)
[![TestRail API](https://img.shields.io/badge/TestRail%20API-v2-teal)](https://support.testrail.com/hc/en-us)
[![Vitest](https://img.shields.io/badge/Vitest-1.2.2-darkgreen)](https://vitest.dev/)
[![Playwright](https://img.shields.io/badge/Playwright-1.41.2-blue)](https://playwright.dev/)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES6-yellow)](https://www.javascript.com/)


# TestRail Reporter for all popular JS | TS based testing frameworks


**The TestRail reporter package currently supports [Vitest](https://vitest.dev/), [Playwright](https://playwright.dev/) test frameworks. The support for [Jest](https://jestjs.io/) and other runners currently in the development process.**

The package allows you to synchronize auto test results with associated [TestRail](https://www.testrail.com/) tests through simple configuration.


## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Usage](#usage)
- [TestRail Configuration](#testrail-configuration)
- [Workflow](#workflow)
- [License](#license)


## Features

The reporter supports the following features

- Supports Vitest, Playwright testing frameworks.
- Associate Vitest, Playwright tests with TestRail tests.
- Generate a run in TestRail using specified test cases or all available test cases. Alternatively, the reporter can connect to and utilize an already created test run (manually initiated through the TestRail graphical user interface).
- Update the test run results in TestRail either after running all test cases or simultaneously.
- You have an option to update the test results of the same test run which executed several times, by saving all history data. Or you can create a new test run for every execution.
- If a test case fails, you can observe an error message in the comment field of the TestRail test result.

## Installation

To install [testrail-reporter](https://www.npmjs.com/package/@zealteam/testrail-reporter?activeTab=readme), use the following command:

```code
 npm install @zealteam/testrail-reporter
```

## Usage

To generate a report with [Vitest](https://vitest.dev/) or [Playwright](https://playwright.dev/) and upload it to [TestRail](https://www.testrail.com/), follow these steps:

1. Add reporter to the config file
    - Vitest: Configure Vitest by adding the TestRail reporter as a reporter in your Vitest config file. Open your Vitest config file (e.g., `vitest.config.js`) and add `'@zealteam/testrail-reporter'` into the `reporters` array. See below

    ```javascript
    teardownTimeout: 200000,
    reporters: ['default', '@zealteam/testrail-reporter'],
    ```

    Note: It is advisable to include the `teardownTimeout` in any of these configurations since the reporter may run after the tests have completed, and setting it to a large number is recommended.

    **You must include the `default` runner or your tests won't run properly.**
    - Playwright: Configure Playwright by adding the TestRail reporter as a reporter in your Playwright config file. Open your Playwright config file (e.g., `playwright.config.js`) and add `'@zealteam/testrail-reporter'` into the `reporters` array. See below

    ```javascript
    reporter: [['list'], ['@zealteam/testrail-reporter']],
    ```

2. Create a `testrail.config.js` file in your project's root directory. Enter the following credentials in the file:

```javascript
module.exports = {
  base_url: "https://example.testrail.io",
  user: "username",
  pass: "password",
  project_id: 1,
  suite_id: 1,
  testRailUpdateInterval: 0,
  updateResultAfterEachCase: true,
  use_existing_run: {
    id: 0,
  },
  create_new_run: {
    include_all: false,
    run_name: "Test Run",
    milestone_id: 0
  },
  status: {
    passed: 1,
    failed: 5,
    untested: 3,
    skipped: 6
  }
};
```

- **`base_url`**

    - Replace "https://example.testrail.io" with the actual base URL of your TestRail instance.

- **`user`**

    - Replace "username" with the actual username of your TestRail account.

- **`pass`**

    - Replace "password" with the actual password of your TestRail account.

- **`project_id and suite_id`**

    - Replace the values of project_id's and suite_id's with the corresponding values specific to your project..

- **`testRailUpdateInterval`** - Default is `0` (seconds).

    - When set to 0, the test results will be updated in TestRail after all tests have been executed.
    - If set to another value (e.g., 10), the test results will be updated in TestRail every 10 seconds.
    - If set to a value greater than 59, it will be rounded to minutes, and the results will be updated in TestRail every specified minute.

- **`updateResultAfterEachCase`** - Default is `true`.  Please note that this configuration is only compatible with Playwright.

    - If set to `true` the test results will be updated in TestRail after each test have been executed and `testRailUpdateInterval` config will be ignored.
    - If set to `false` the test results will be updated in TestRail based on the `testRailUpdateInterval` value. 

- **`use_existing_run`**

    - **`id`** - Default is `0`.

        - You have the option to supply an existing test run `id` from your TestRail. When an `id` is provided, your results will be stored in the designated test run, and the reporter will ignore the configurations within the `create_new_run` settings. The same test run will be updated on subsequent runs, and historical data will be maintained within that run.

NOTE: The configs under `create_new_run` will be used if `id` is `0`.

- **`create_new_run`**

    - **`run_name`**

        - If you want to create a new run in TestRail, you can provide a value for `run_name` or the reporter will use the default `Test Run` value. The run name will be composed of the following combination: `'<run_name> <current_date>` (e.g., `Test Run 22.1.2024`).

    - **`include_all`** - Default is `false`

        - When set to false, the newly created TestRail's test run will only include the test cases that are scheduled to execute from Vitest.
        - When set to true, the newly created TestRail's test run will include all test cases within the specified test suite from TestRail.
    
    - **`milestone_id`** Default is `0`

        - If you have a milestone in your TestRail, you can set the `milestone_id`. The configuration will be ignored if the value is 0.

- **`status`**

    - The `status` configuration in the provided module is a set of status mappings used to interpret and communicate the test results to TestRail. You should configure your case statuses from TestRail(Administration > Customizations > RESULT STATUSES) and set to provided configuration
  
```javascript
  status: {
    passed: 1,
    failed: 5,
    untested: 3,
    skipped: 6
  }
```

3. Write your tests using Vitest and Playwright, ensuring that each test has appropriate assertions and result statuses. You can include the TestRail test IDs in the test names or descriptions. For example:

```javascript
it('Should perform a specific task @C123', async () => {
  // Test logic here
});
```

In the example above, _`@C123`_ represents the TestRail test ID. Replace _`C123`_ with the actual test ID from TestRail.

4. Run your tests with Vitest and Playwright as you normally would. The TestRail reporter will collect the test results.

5. After running your tests, the TestRail reporter will automatically upload the test results to your TestRail project based on the provided configuration.

Here is a quick GIF demonstrating how to configure your project.

![alt text](static/images/reporter_installation_and_configuration.gif)

## TestRail Configuration

You should Enable API and Enable session authentication for API from testrail settings(It can be enabled in the administration area in TestRail under Administration > Site Settings > API.)

## Workflow

Here is a workflow of the reporter

![alt text](static/images/workflow.png)

## License

This project is licensed under the MIT License - see the [LICENSE](https://github.com/zealous-tech/testrail-reporter/blob/main/LICENSE) file for details.


NOTE: Ensure that within your project, the `node_modules`, configuration file, and the `tests` folder are located at the same level.

Differences Between testrail-reporter and TestRail CLI (The TestRail CLI is a command-line interface tool developed by the TestRail team, allowing users to upload test automation results from any JUnit-style XML file to TestRail.)

| Feature           | testrail-reporter | TestRail CLI |
|-------------------|-------------------|--------------|
| Simultaneously Result Updates          | Supported        | Not support       |
| Selecting the Time Interval for Updating Results          | Supported        | Not support       |
| Updating Results After Running All Test Cases           | Supported               | Supported   |
| Storing Step Results     | Supported       | Supported  |
| Adding  Comment to the Results     | Supported       | Supported  |
| Creating New Run | Supported              | Supported       |
| Updating Existing Run       | Supported              | Supported         |
| Attaching Screenshots or Logs       | Support is Currently in Development             | Supported         |
| Custom Status Support (xfail, fixed)       | Support is Currently in Development              | Not support         |
| Adding New Case to Existing Test Run       | Support is Currently in Development              | Supported         |
| Adding New Case to Test Suite       | Not support              | Supported         |
