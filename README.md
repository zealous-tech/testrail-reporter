# testrail-reporter

[![Version](https://img.shields.io/badge/version-1.0.0-green.svg)](https://semver.org)


TestRail Reporter is a package that allows you to easily generate reports for your tests using Vitest and integrate them with TestRail, a popular test management system. With this package, you can streamline your testing process by automatically synchronizing your test results with TestRail, providing valuable insights and analytics for your test executions.

## Features

The reporter supports the following features

- Create a test run in TestRail, including all test cases from the mentioned suite or including only those cases that you selected to run.
- Update the test results in TestRail either after running all test cases or after at specified time intervals.
- The reporter offers the functionality to either generate a new test run in TestRail or update the existing one. You have an option to update the test results of the same test run which executed several times during a day, by saving all history data. Or you can create a new test run for every execution during the same day.
- If a test case fails, you can observe an error message in the comment field.

## Installation

To install testrail-reporter, use the following command:

```code
 npm install @zealteam/testrail-reporter
```

## Usage

To generate a report with Vitest and upload it to TestRail, follow these steps:

1. Configure Vitest by adding the TestRail reporter as a reporter in your Vitest config file. Open your Vitest config file (e.g., `vitest.config.ts`) and add the following line to the `reporters` array:

```typescript
teardownTimeout: 200000,
reporters: ['default', 'testrail-reporter'],
```

Note: It is advisable to include the `teardownTimeout` in any of these configurations since the reporter may run after the tests have completed, and setting it to a large number is recommended.

You must include the default runner or your tests won't run properly.

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
    single_run_per_day: true,
    include_all: false,
    run_name: "Test Run"
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

- **`use_existing_run`**

  - **`id`** - Default is `0`.

    - You have the option to supply an existing test run `id` from your TestRail. When an `id` is provided, your results will be stored in the designated test run, and the reporter will ignore the configurations within the `create_new_run` settings.

NOTE: The configs under `create_new_run` will be used if `id` is `0`.

- **`create_new_run`**

  - **`run_name`**

    - If you want to create a new run in TestRail, you must provide a value for `run_name`. The run name will be composed of the following combination: `Run name 'current date'` (e.g., `This is the new run 22.1.2024`).

  - **`single_run_per_day`** - Default is `true`.

    - If set to `true`, one test run should be created per day. The same test run will be updated on subsequent runs for the same day, and historical data will be maintained within that run.
    - If set to `false`, a new test run will be created each time the tests are being executed.

  - **`include_all`** Default is `false`

    - When set to false, the test run will only include the test cases that are scheduled to execution.
    - When set to true, the test run will encompass all test cases within the specified test suite, regardless of their scheduled status.

NOTE: If `single_run_per_day` is `true` and you've already created a run in TestRail, but the `run_name` doesn't match the provided name, the reporter will create a new test run in TestRail. To use an existing run, provide the run `id`, or set `single_run_per_day` to `true` and ensure the `run_name` matches the existing run name in TestRail.

- **`project_id and suite_id`**

  - Replace the values of project_id's and suite_id's with the corresponding values specific to your project..

- **`testRailUpdateInterval`** - Default is `0` (seconds).

  - When set to 0, the test results will be updated in TestRail after all tests have been executed.
  - If set to another value (e.g., 10), the test results will be updated in TestRail every 10 seconds.
  - If set to a value greater than 59, it will be rounded to minutes, and the results will be updated in TestRail every specified minute.

- **`status`**

  - The `status` configuration in the provided module is a set of status mappings used to interpret and communicate the test results to TestRail. You should configure your case statuses from TestRail(Administration > Customizations > RESULT STATUSES) and set to provided configuration
  ```typescript
  status: {
    pass: 1,
    fail: 5,
    skipped: 6
  }```
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