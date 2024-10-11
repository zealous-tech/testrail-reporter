# Mock TestRail Server

This mock TestRail server simulates key API endpoints of TestRail, allowing you to test and develop integrations without using a real TestRail server.

## Features

- Mock TestRail API endpoints to create test runs, add test cases, add results, and fetch data.
- Easily customizable database for storing and retrieving test data.
- Simulates essential TestRail functionalities, including test case creation and test result submission.

## Prerequisites

Before setting up the mock server, ensure that you have the following installed:

- **PHP** (minimum version 7.4)
- **Composer** (optional, but recommended if you plan to install additional PHP libraries)

### Step 1: Install PHP

#### On Linux (Debian-based systems like Ubuntu)

```bash
sudo apt update
sudo apt install php-cli php-json
```

#### On macOS

1. Open Terminal.
2. Install PHP using Homebrew:

   ```bash
   brew install php
   ```

### Step 2: Configure the Mock TestRail Server

Edit the config.php file to set your base URL and other necessary configuration options:

```php
<?php
return [
    'base_url' => 'http://localhost:3001',
    'user' => 'user_name_or_email',
    'pass': "password",
    'project_id' => 1,
    'suite_id' => 1,
    'status' => [
        'passed' => 1,
        'failed' => 5,
        'untested' => 3
    ]
];
```

Make sure the `mock_testrail_db.json` file exists in your project directory. If not, create an empty `mock_testrail_db.json` file:

```bash
touch mock_testrail_db.json
```
### Step 3: Start the Mock Server

Run the PHP built-in server from the project directory:

```bash
php -S http://localhost:3001
```
This will start the server on `http://localhost:3001`

### Step 4: Test API Endpoints
You can now access the mock TestRail API at `http://localhost:3001`. Here are some example API endpoints:

#### Add Test Run:
```bash
POST http://localhost:3001/index.php?/api/v2/add_run/1
```
#### Add Test Case:
```bash
POST http://localhost:3001/index.php?/api/v2/add_case/{project_id}&suite_id={suite_id}
```
#### Add Results for Cases:
```bash
POST http://localhost:3001/index.php?/api/v2/add_results_for_cases/{run_id}
```
#### Get Run
```bash
GET http://localhost:3001/index.php?/api/v2/get_run/{run_id}
```
#### Get Runs:
```bash
GET http://localhost:3001/index.php?/api/v2/get_runs/{project_id}
```

### Step 5: Customize the Database

The mock server uses a JSON file to simulate a database `mock_testrail_db.json`. You can edit or reset this file as needed.

### Step 6: Example Requests
Use curl or a tool like Postman to test your API. Here is an example request to add a test case:

```bash
curl -X POST http://localhost:3001/index.php?/api/v2/add_case/1?suite_id=1 \
-H "Content-Type: application/json" \
-d '{
  "title": "Sample Test Case",
  "section_id": 2,
  "template_id": 1,
  "type_id": 7,
  "priority_id": 2
}'
```

### Step 7: Stop the Server
To stop the server, simply press ` Ctrl + C ` in the terminal where the PHP server is running.