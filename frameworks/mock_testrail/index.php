<?php
$config = include 'config.php';

// Enable CORS if needed (for testing with different tools)
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');

// Basic Authentication
if (!isset($_SERVER['PHP_AUTH_USER']) || !isset($_SERVER['PHP_AUTH_PW'])) {
    header('HTTP/1.1 401 Unauthorized');
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

if ($_SERVER['PHP_AUTH_USER'] !== $config['user'] || $_SERVER['PHP_AUTH_PW'] !== $config['pass']) {
    header('HTTP/1.1 401 Unauthorized');
    echo json_encode(['error' => 'Invalid credentials']);
    exit;
}

// Helper function to read JSON database
function readDatabase() {
    $data = file_get_contents('mock_testrail_db.json');
    return json_decode($data, true) ?: [
        'testRuns' => [],
        'testResults' => [],
        'attachments' => [],
        'testCasesInRun' => [],
        'milestones' => [],
        'nextRunId' => 101,
        'nextResultId' => 1,
        'nextAttachmentId' => 1,
    ];
}

// Helper function to write JSON database
function writeDatabase($data) {
    $filename = 'mock_testrail_db.json';
    file_put_contents($filename, json_encode($data, JSON_PRETTY_PRINT));
    return true;

}

// Load the mock database
$database = readDatabase();

// Extract the request URL and method
$request_uri = $_SERVER['REQUEST_URI'];
$method = $_SERVER['REQUEST_METHOD'];

// GET /index.php?/api/v2/get_cases/{project_id}&suite_id={suite_id}
if (preg_match('/\/index\.php\?\/api\/v2\/get_cases\/(\d+)/', $request_uri, $matches)) {
    $projectId = $matches[1];

    // Extract suite_id from the query string
    $query_params = [];
    parse_str(parse_url($request_uri, PHP_URL_QUERY), $query_params);

    // Make sure you handle both cases (either ? or &)
    $suiteId = isset($query_params['suite_id']) ? $query_params['suite_id'] : null;


    if ($method === 'GET' && $suiteId) {
        if (isset($database['testCases'][$projectId][$suiteId])) {
            $testCases = [];
            foreach ($database['testCases'][$projectId][$suiteId] as $index => $case){
                $testCases[] = $case;
            };
            $response = [
                "offset" => 0,
                "limit" => 250,
                "size" => 250,
                "_links" => [
                    "next" => null,
                    "prev" => null
                ],
                "cases" => $testCases
            ];
            echo json_encode($response);
        } else {
            header('HTTP/1.1 404 Not Found');
            echo json_encode(['error' => 'Test cases not found']);
        }
    }
}
// GET /index.php?/api/v2/get_run/{run_id}
elseif (preg_match('/\/index\.php\?\/api\/v2\/get_run\/(\d+)/', $request_uri, $matches)) {
    $runId = $matches[1];

    if ($method === 'GET') {
        if (isset($database['testRuns'][$runId])) {
            echo json_encode($database['testRuns'][$runId]);
        } else {
            header('HTTP/1.1 404 Not Found');
            echo json_encode(['error' => 'Run not found']);
        }
    }
}
// GET index.php?/api/v2/get_runs/{project_id}
elseif (preg_match('/\/index\.php\?\/api\/v2\/get_runs\/(\d+)/', $request_uri, $matches)) {
    $project_id = $matches[1]; // Extract project_id from the URL

    if ($method === 'GET') {
        // Check if the project exists in the database
        if ($config['project_id'] != $project_id) {
            header('HTTP/1.1 404 Not Found');
            echo json_encode(['error' => 'Project not found']);
            exit;
        }
        // Check if there are any test runs associated with this project
        $runs = [];
        foreach ($database['testRuns'] as $run_id => $run) {
            if ($run['project_id'] == $project_id) {
                // Collect the relevant test run details
                $runs[] = [
                    'id' => $run_id,
                    'name' => $run['name'],
                    'description' => $run['description'],
                    'milestone_id' => $run['milestone_id'],
                    'assignedto_id' => $run['assignedto_id'],
                    'include_all' => $run['include_all'],
                    'is_completed' => $run['is_completed'],
                    'completed_on' => $run['completed_on'],
                    'created_on' => $run['created_on'],
                    'updated_on' => $run['updated_on'],
                    'url' => $run['url']
                ];
            }
        }
        // If there are no test runs, return an empty array
        if (empty($runs)) {
            $runs = [];
        }
        // Return the runs in JSON format
        echo json_encode($runs);
    }
}
// POST /index.php?/api/v2/update_run/{run_id}
elseif (preg_match('/\/index\.php\?\/api\/v2\/update_run\/(\d+)/', $request_uri, $matches)) {
    $runId = $matches[1];

    if ($method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        if (isset($database['testRuns'][$runId])) {
            $database['testRuns'][$runId] = array_merge($database['testRuns'][$runId], $input);
            // Save the updated run
            writeDatabase($database);
            echo json_encode($database['testRuns'][$runId]);
        } else {
            header('HTTP/1.1 400 Bad Request');
            echo json_encode(['error' => 'Field :run_id is not a valid test run']);
            exit;
        }
    }
}
// GET /index.php?/api/v2/get_results_for_run/{run_id}
elseif (preg_match('/\/index\.php\?\/api\/v2\/get_results_for_run\/(\d+)/', $request_uri, $matches)) {
    $run_id = $matches[1]; // Extract run_id from the URL

    if ($method === 'GET') {
        // Check if the run exists
        if (!isset($database['testRuns'][$run_id])) {
            header('HTTP/1.1 404 Not Found');
            echo json_encode(['error' => 'Test run not found']);
            exit;
        }
        $results = [];
        $tests = $database['testRuns'][$run_id]['tests'];
        foreach ($tests as $test) {
            if (isset($test['results'])) {
                foreach ($test['results'] as $result) {
                    $results[] = [
                        'assignedto_id' => isset($result['assignedto_id']) ? $result['assignedto_id'] : null,
                        'comment' => isset($result['comment']) ? $result['comment'] : '',
                        'created_by' => $result['created_by'],
                        'created_on' => $result['created_on'],
                        'custom_step_results' => isset($result['custom_step_results']) ? $result['custom_step_results'] : [],
                        'defects' => isset($result['defects']) ? $result['defects'] : null,
                        'elapsed' => isset($result['elapsed']) ? $result['elapsed'] : null,
                        'id' => $result['id'],
                        'status_id' => isset($result['status_id']) ? $result['status_id'] : null,
                        'test_id' => $result['test_id'],
                        'version' => isset($result['version']) ? $result['version'] : null,
                    ];
                }
            }
        }
        // Return the paginated response with defaults
        $response = [
            'offset' =>0,  // Default to 0 if not provided
            'limit' => 250,  // Default to 250 if not provided
            'size' => 0,      // Default to 0 if size calculation fails
            '_links' => [
                'next' => null, // Default to null
                'prev' => null  // Default to null
            ],
            'results' => $results
        ];
        // Output the response as JSON
        header('Content-Type: application/json');
        echo json_encode($response);
    }
}
// GET /index.php?/api/v2/get_tests/{run_id}
elseif (preg_match('/\/index\.php\?\/api\/v2\/get_tests\/(\d+)/', $request_uri, $matches)) {
    $runId = $matches[1];
    $method = $_SERVER['REQUEST_METHOD'];
    if ($method === 'GET') {
        // Check if the run ID exists in the database
        if (!isset($database['testRuns'][$runId])) {
            // Return error if the run ID does not exist
            header('HTTP/1.1 400 Bad Request');
            echo json_encode(['error' => 'Field :run_id is not a valid test run']);
            exit;
        }        
        // Get the tests for this run
        $tests = $database['testRuns'][$runId]['tests'];
        // Response structure
        $response = [
            "offset" => 0,
            "limit" => 250,
            "size" => count($tests),
            "_links" => [
                "next" => null,
                "prev" => null
            ],
            "tests" => $tests
        ];

        echo json_encode($response);
    }
}
// POST /index.php?/api/v2/add_run/{project_id}
elseif (preg_match('/\/index\.php\?\/api\/v2\/add_run\/(\d+)/', $request_uri, $matches)) {
    $projectId = $matches[1];

    if ($method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        $suiteId = isset($input['suite_id']) ? $input['suite_id'] : null;

        // Validate milestone_id
        if (isset($input['milestone_id']) && !in_array($input['milestone_id'], array_keys($database['milestones']))) {
            header('HTTP/1.1 400 Bad Request');
            echo json_encode(['error' => 'Field :milestone_id is not a valid milestone']);
            exit;
        }

        // Check if the project and suite exist
        if (isset($database['testCases'][$projectId][$suiteId])) {
            $run_id = $database['nextRunId']++;
            $run_name = isset($input['name']) ? $input['name'] : 'New Test Run';
            $description = isset($input['description']) ? $input['description'] : 'Default Description';
            $include_all = isset($input['include_all']) ? $input['include_all'] : true; // Default to true
            $case_ids = isset($input['case_ids']) ? $input['case_ids'] : [];
            $run_url = $config['base_url'] . '/index.php?/runs/view/' . $run_id;

            // Create the tests for the run
            $tests = [];
            if ($include_all) {
                // Include all test cases from the suite if include_all is true
                foreach ($database['testCases'][$projectId][$suiteId] as $case_id => $case_data) {
                    $test = [
                        "id" => count($tests) + 1, // Unique ID for each test in the run
                        "case_id" => $case_id,
                        "status_id" => 3, // Default to 'untested'
                        "assignedto_id" => null,
                        "run_id" => $run_id,
                        "title" => $case_data['title'],
                        "template_id" => $case_data['template_id'],
                        "type_id" => $case_data['type_id'],
                        "priority_id" => $case_data['priority_id'],
                        "estimate" => null,
                        "estimate_forecast" => "1s",
                        "refs" => null,
                        "milestone_id" => null,
                        "case_assignedto_id" => null,
                        "custom_steps" => isset($case_data['custom_steps_separated']) ? count($case_data['custom_steps_separated']) : null,
                        "custom_steps_separated" => isset($case_data['custom_steps_separated']) ? $case_data['custom_steps_separated'] : [],
                    ];
                    $tests[] = $test;
                }
            } else {
                // Only include specified case_ids if include_all is false
                foreach ($case_ids as $case_id) {
                    if (isset($database['testCases'][$projectId][$suiteId][$case_id])) {
                        $case_data = $database['testCases'][$projectId][$suiteId][$case_id];
                        $test = [
                            "id" => count($tests) + 1, // Unique ID for each test in the run
                            "case_id" => $case_id,
                            "status_id" => 3, // Default to 'untested'
                            "assignedto_id" => null,
                            "run_id" => $run_id,
                            "title" => $case_data['title'],
                            "template_id" => $case_data['template_id'],
                            "type_id" => $case_data['type_id'],
                            "priority_id" => $case_data['priority_id'],
                            "estimate" => null,
                            "estimate_forecast" => "1s",
                            "refs" => null,
                            "milestone_id" => null,
                            "case_assignedto_id" => null,
                            "custom_steps" => isset($case_data['custom_steps_separated']) ? count($case_data['custom_steps_separated']) : null,
                            "custom_steps_separated" => isset($case_data['custom_steps_separated']) ? $case_data['custom_steps_separated'] : [],
                        ];
                        $tests[] = $test;
                    } else {
                        header('HTTP/1.1 404 Not Found');
                        echo json_encode(['error' => "Test case $case_id not found"]);
                        exit;
                    }
                }
            }

            // Create the run data and include the tests
            $run = [
                'id' => $run_id,
                'suite_id' => $suiteId,
                'name' => $run_name,
                'description' => $description,
                'milestone_id' => isset($input['milestone_id']) ? $input['milestone_id'] : null,
                'assignedto_id' => isset($input['assignedto_id']) ? $input['assignedto_id'] : null,
                'include_all' => $include_all,
                'is_completed' => false,
                'completed_on' => null,
                'passed_count' => 0,
                'blocked_count' => 0,
                'untested_count' => count($tests), // Initially all tests are untested
                'retest_count' => 0,
                'failed_count' => 0,
                'custom_status1_count' => 0,
                'custom_status2_count' => 0,
                'custom_status3_count' => 0,
                'custom_status4_count' => 0,
                'custom_status5_count' => 0,
                'custom_status6_count' => 0,
                'custom_status7_count' => 0,
                'project_id' => $projectId,
                'plan_id' => null,
                'created_on' => time(),
                'updated_on' => time(),
                'refs' => null,
                'dataset_id' => null,
                'created_by' => 1,
                'url' => $run_url,
                'tests' => $tests // Add the dynamically created tests to the run
            ];

            // Save the run in the testRuns section of the database
            $database['testRuns'][$run_id] = $run;

            // Save the updated database
            if (writeDatabase($database)) {
                // Return only the required parts of the response
                $response = [
                    'id' => $run['id'],
                    'suite_id' => $run['suite_id'],
                    'name' => $run['name'],
                    'description' => $run['description'],
                    'milestone_id' => $run['milestone_id'],
                    'assignedto_id' => $run['assignedto_id'],
                    'include_all' => $run['include_all'],
                    'is_completed' => $run['is_completed'],
                    'passed_count' => $run['passed_count'],
                    'blocked_count' => $run['blocked_count'],
                    'untested_count' => $run['untested_count'],
                    'retest_count' => $run['retest_count'],
                    'failed_count' => $run['failed_count'],
                    'project_id' => $run['project_id'],
                    'created_on' => $run['created_on'],
                    'updated_on' => $run['updated_on'],
                    'url' => $run['url'],
                ];

                echo json_encode($response);
            } else {
                header('HTTP/1.1 500 Internal Server Error');
                echo json_encode(['error' => 'Failed to write database']);
            }
        } else {
            header('HTTP/1.1 404 Not Found');
            echo json_encode(['error' => 'Project or Suite not found']);
        }
    }
}

// POST index.php?/api/v2/delete_run/{run_id}
elseif (preg_match('/\/index\.php\?\/api\/v2\/delete_run\/(\d+)/', $request_uri, $matches)) {
    $run_id =  $matches[1];
    if ($method === 'POST') {
        // Check if the run exists
        if (!isset($database['testRuns'][$run_id])) {
            // If the run is not found, return a 404 response
            header('HTTP/1.1 404 Not Found');
            echo json_encode(['error' => 'Test run not found']);
            exit;
        }

        // If the run exists, delete it
        unset($database['testRuns'][$run_id]);

        // Save the updated database
        writeDatabase($database);

        // Return success response
        header('HTTP/1.1 200 OK');
        echo json_encode(['message' => 'Test run deleted successfully: ID ' . $run_id]);
    }
}
// POST /index.php?/api/v2/add_result_for_case/{run_id}/{case_id}
elseif (preg_match('/\/index\.php\?\/api\/v2\/add_result_for_case\/(\d+)\/(\d+)/', $request_uri, $matches)) {
    $runId = $matches[1];
    $caseId = $matches[2];

    if ($method === 'POST') {
        $result = json_decode(file_get_contents('php://input'), true);
        // Check if the test run exists
        if (!isset($database['testRuns'][$runId])) {
            header('HTTP/1.1 404 Not Found');
            echo json_encode(['error' => 'Test run not found']);
            exit;
        }
        $new_result = null;
        // Check if the test case exists in the run
        foreach ($database['testRuns'][$runId]['tests'] as $index => $test) {
            if ($test['case_id'] == $caseId) {
                // Create a new result object
                $new_result = [
                    'id' => $database['nextResultId']++,  // Unique result ID
                    'assignedto_id' => isset($result['assignedto_id']) ? $result['assignedto_id'] : null,
                    'title' => isset($result['title']) ? $result['title'] : 'Untitled Test',
                    'comment' => isset($result['comment']) ? $result['comment'] : '',
                    'created_by' => 1,  // Static user ID for example purposes
                    'created_on' => time(),
                    'custom_step_results' => [],  // To be populated below
                    'defects' => isset($result['defects']) ? $result['defects'] : null,
                    'elapsed' => isset($result['elapsed']) ? $result['elapsed'] : null,
                    'status_id' => isset($result['status_id']) ? $result['status_id'] : null,
                    'test_id' => $test['id'],
                    'version' => isset($result['version']) ? $result['version'] : null,
                    'attachments' => isset($result['attachments']) ? $result['attachments'] : [],
                ];

                // Check and populate the custom_step_results if they exist in the request payload
                if (isset($result['custom_step_results']) && is_array($result['custom_step_results'])) {
                    foreach ($result['custom_step_results'] as $step_result) {
                        $new_result['custom_step_results'][] = [
                            'content' => isset($step_result['content']) ? $step_result['content'] : '',
                            'expected' => isset($step_result['expected']) ? $step_result['expected'] : '',
                            'actual' => isset($step_result['actual']) ? $step_result['actual'] : '',
                            'status_id' => isset($step_result['status_id']) ? $step_result['status_id'] : null,
                        ];
                    }
                }

                // Save the result and update the status of the test case in the run
                $database['testRuns'][$runId]['tests'][$index]['results'][] = $new_result;
                $database['testRuns'][$runId]['tests'][$index]['status_id'] = $new_result['status_id'];

                break;
            }
        }

        // Save the updated database to persist the changes
        writeDatabase($database);

        // Return the newly created result in JSON format
        echo json_encode($new_result);
    }
}
// POST /index.php?/api/v2/add_results_for_cases/{run_id}
elseif (preg_match('/\/index\.php\?\/api\/v2\/add_results_for_cases\/(\d+)/', $request_uri, $matches)) {
    $run_id = $matches[1]; // Extract run_id from the URL

    if ($method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        $results = isset($input['results']) ? $input['results'] : [];

        if (!isset($database['testRuns'][$run_id])) {
            header('HTTP/1.1 404 Not Found');
            echo json_encode(['error' => 'Test run not found']);
            exit;
        }

        $response = [];
        foreach ($results as $result) {
            $case_id = isset($result['case_id']) ? $result['case_id'] : null;

            // Check if the case exists in the run
            foreach ($database['testRuns'][$run_id]['tests'] as $index => $test) {
                if ($test['case_id'] == $case_id) {
                    // Create a new result object
                    $new_result = [
                        'assignedto_id' => isset($result['assignedto_id']) ? $result['assignedto_id'] : null,
                        'title' => isset($result['title']) ? $result['title'] : 'Untitled Test',
                        'comment' => isset($result['comment']) ? $result['comment'] : '',
                        'created_by' => 1, // Static user ID for example purposes
                        'created_on' => time(),
                        'custom_step_results' => [],
                        'defects' => isset($result['defects']) ? $result['defects'] : null,
                        'elapsed' => isset($result['elapsed']) ? $result['elapsed'] : null,
                        'id' => $database['nextResultId']++, // Unique result ID
                        'status_id' => isset($result['status_id']) ? $result['status_id'] : null,
                        'test_id' => $test['id'],
                        'version' => isset($result['version']) ? $result['version'] : null,
                        'attachments' => isset($result['attachments']) ? $result['attachments'] : [],
                    ];
                    // Check and populate the custom_step_results if they exist in the request payload
                    if (isset($result['custom_step_results']) && is_array($result['custom_step_results'])) {
                        foreach ($result['custom_step_results'] as $step_result) {
                            $new_result['custom_step_results'][] = [
                                'content' => isset($step_result['content']) ? $step_result['content'] : '',
                                'expected' => isset($step_result['expected']) ? $step_result['expected'] : '',
                                'actual' => isset($step_result['actual']) ? $step_result['actual'] : '',
                                'status_id' => isset($step_result['status_id']) ? $step_result['status_id'] : null,
                            ];
                        }
                    }
                    // Save the result and update the status
                    $database['testRuns'][$run_id]['tests'][$index]['results'][] = $new_result;
                    $database['testRuns'][$run_id]['tests'][$index]['status_id'] = $new_result['status_id'];
                    // Add to response
                    $response[] = $new_result;
                    break;
                }
            }
        }
        // Save the updated database
        writeDatabase($database);

        // Return the results in JSON format
        echo json_encode($response);
    }
}
// POST /index.php?/api/v2/add_attachment_to_result/{result_id}
elseif (preg_match('/\/index\.php\?\/api\/v2\/add_attachment_to_result\/(\d+)/', $request_uri, $matches)) {
    $resultId = $matches[1];

    if ($method === 'POST' && isset($_FILES['attachment'])) {
        $file = $_FILES['attachment'];
        $fileData = file_get_contents($file['tmp_name']);  // Read the file content

        if (!$fileData) {
            header('HTTP/1.1 400 Bad Request');
            echo json_encode(['error' => 'No file content received']);
            exit;
        }

        $attachment = [
            'id' => $database['nextAttachmentId']++,  // Generate a new attachment ID
            'result_id' => (int)$resultId,
            'file_name' => $file['name'],
            'content' => base64_encode($fileData)  // Encode file content
        ];
        // $database['attachments'][] = $attachment; // We don't need to have even more data in the mock DB

        // Save the data
        // writeDatabase($database);

        echo json_encode($attachment);
    } else {
        header('HTTP/1.1 400 Bad Request');
        echo json_encode(['error' => 'File not found or invalid request']);
    }
}
// POST /index.php?/api/v2/add_case/{project_id}&suite_id={suite_id} ******
elseif (preg_match('/\/index\.php\?\/api\/v2\/add_case\/(\d+)/', $request_uri, $matches)) {
    $projectId = $matches[1];

    // Extract suite_id from the query string
    $query_params = [];
    parse_str(parse_url($request_uri, PHP_URL_QUERY), $query_params);
    $suiteId = isset($query_params['suite_id']) ? $query_params['suite_id'] : null;

    if ($method === 'POST' && $suiteId) {
        $input = json_decode(file_get_contents('php://input'), true);
        $case_id = $database['nextCaseId']++; // Generate the next unique case ID
        
        // Define the new case
        $newCase = [
            'id' => $case_id,
            'title' => isset($input['title']) ? $input['title'] : 'New Test Case',
            'section_id' => isset($input['section_id']) ? $input['section_id'] : null,
            'template_id' => isset($input['template_id']) ? $input['template_id'] : null,
            'type_id' => isset($input['type_id']) ? $input['type_id'] : null,
            'priority_id' => isset($input['priority_id']) ? $input['priority_id'] : null,
            'milestone_id' => isset($input['milestone_id']) ? $input['milestone_id'] : null,
            'custom_steps_separated' => isset($input['custom_steps_separated']) ? $input['custom_steps_separated'] : [],
            'created_by' => 1,  // Hardcoded user ID for example purposes
            'created_on' => time(),
            'updated_by' => 1,
            'updated_on' => time(),
            'suite_id' => $suiteId,
            'display_order' => isset($input['display_order']) ? $input['display_order'] : null,
            'is_deleted' => 0
        ];

        // Check if the suite exists under the project, and initialize it if necessary
        if (!isset($database['testCases'][$projectId][$suiteId])) {
            $database['testCases'][$projectId][$suiteId] = [];
        }

        // Save the new case in the structure using case_id as the key
        $database['testCases'][$projectId][$suiteId][$case_id] = $newCase;

        // Save the updated database
        writeDatabase($database);

        // Return the newly created case
        echo json_encode($newCase);
    } else {
        // Handle missing suite ID or incorrect method
        header('HTTP/1.1 400 Bad Request');
        echo json_encode(['error' => 'Missing suite_id or incorrect method']);
    }
}
 else {
    header('HTTP/1.1 404 Not Found');
    echo json_encode(['error' => 'Invalid API endpoint']);
}
