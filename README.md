[![Version](https://img.shields.io/badge/version-1.0.0-green)](https://semver.org)
[![Licence](https://img.shields.io/badge/Licence-MIT-green)](https://github.com/zealous-tech/testrail-reporter/blob/main/LICENSE)
[![Node](https://img.shields.io/badge/node->=10.0.0-coral)](https://github.com/zealous-tech/testrail-reporter/blob/main/package.json)
[![TestRail API](https://img.shields.io/badge/TestRail%20API-v2-teal)](https://support.testrail.com/hc/en-us)

# TestRail Reporter for all popular JS | TS based testing frameworks


**The TestRail reporter package currently supports [Vitest](https://vitest.dev/) test framework only. The support for [Jest](https://jestjs.io/), [Playwright](https://playwright.dev/), etc is currently in the development process.**

The package allows you to synchronize auto test results with associated [TestRail](https://www.testrail.com/) tests through simple configuration.

## Features

The reporter supports the following features

- supports Vitest testing framework
- associate Vitest tests with TestRail tests
- create a test run in TestRail by specified test cases or all test cases. Or reporter can link and use existing test run (manually created from TestRail GUI)
- update the test run results in TestRail either after running all test cases or simultaneously
- you have an option to update the test results of the same test run which executed several times during a day, by saving all history data. Or you can create a new test run for every execution during the same day
- if a test case fails, you can observe an error message in the comment field of the TestRail test result

## Installation

To install testrail-reporter, use the following command:

```code
 npm install @zealteam/testrail-reporter
```

## Usage - Vitest

To generate a report with [Vitest](https://vitest.dev/) and upload it to [TestRail](https://www.testrail.com/), follow these steps:

1. Configure Vitest by adding the TestRail reporter as a reporter in your Vitest config file. Open your Vitest config file (e.g., `vitest.config.ts`) and add `'@zealteam/testrail-reporter'` into the `reporters` array. See below

```typescript
teardownTimeout: 200000,
reporters: ['default', '@zealteam/testrail-reporter'],
```

Note: It is advisable to include the `teardownTimeout` in any of these configurations since the reporter may run after the tests have completed, and setting it to a large number is recommended.

**You must include the `default` runner or your tests won't run properly.**

2. Create a `testrail.config.ts` file in your project's root directory. Enter the following credentials in the file:

```typescript
module.exports = {
  base_url: "https://example.testrail.io",
  user: "username",
  pass: "password",
  project_id: 1,
  suite_id: 1,
  testRailUpdateInterval: 0,
  use_existing_run: {
    id: 0,
  },
  create_new_run: {
    include_all: false,
    run_name: "Test Run",
    milestone_id: 0
  },
  status: {
    pass: 1,
    fail: 5,
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

- **`use_existing_run`**

    - **`id`** - Default is `0`.

        - You have the option to supply an existing test run `id` from your TestRail. When an `id` is provided, your results will be stored in the designated test run, and the reporter will ignore the configurations within the `create_new_run` settings. The same test run will be updated on subsequent runs, and historical data will be maintained within that run.

NOTE: The configs under `create_new_run` will be used if `id` is `0`.

- **`create_new_run`**

    - **`run_name`**

        - If you want to create a new run in TestRail, you can provide a value for `run_name` or the reporter will use the default `Test Run` value. The run name will be composed of the following combination: `'<run_name> <current_date>` (e.g., `Test Run 22.1.2024`).

    - **`include_all`** Default is `false`

        - When set to false, the newly created TestRail's test run will only include the test cases that are scheduled to execute from Vitest.
        - When set to true, the the newly created TestRail's test run will include all test cases within the specified test suite from TestRail.
    
    - **`milestone_id`** Default is `0`

        - If you have a milestone in your TestRail, you can set the `milestone_id`. The configuration will be ignored if the value is 0.

- **`status`**

    - The `status` configuration in the provided module is a set of status mappings used to interpret and communicate the test results to TestRail. You should configure your case statuses from TestRail(Administration > Customizations > RESULT STATUSES) and set to provided configuration
  
```typescript
  status: {
    pass: 1,
    fail: 5,
    skipped: 6
  }
```

3. Write your tests using Vitest, ensuring that each test has appropriate assertions and result statuses. You can include the TestRail test IDs in the test names or descriptions. For example:

```typescript
it('Should perform a specific task @C123', async () => {
  // Test logic here
});
```

In the example above, _`@C123`_ represents the TestRail test ID. Replace _`C123`_ with the actual test ID from TestRail.

4. Run your tests with Vitest as you normally would. The TestRail reporter will collect the test results.

5. After running your tests, the TestRail reporter will automatically upload the test results to your TestRail project based on the provided configuration.

## TestRail Configuration

You should Enable API and Enable session authentication for API from testrail settings(It can be enabled in the administration area in TestRail under Administration > Site Settings > API.)

## License

This project is licensed under the MIT License - see the [LICENSE](https://github.com/zealous-tech/testrail-reporter/blob/main/LICENSE) file for details.