module.exports = {
  base_url: "http://localhost:3001",
  user: "MyEmail",
  pass: "MyPassword",
  project_id: 1,
  suite_id: 2,
  testRailUpdateInterval: 0,
  updateResultAfterEachCase: false,
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
    pending: 4,
    skipped: 6,
    expFail: 7,
    fixed: 9
  }
};