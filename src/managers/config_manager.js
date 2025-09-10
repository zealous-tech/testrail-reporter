const configPath = path.resolve(process.cwd(), DEFAULT_CONFIG_FILENAME);
const Joi = require('joi')
const getLogger = require("./logger.js");
const {
  base_url,
  user,
  pass,
  project_id,
  suite_id,
  create_missing_cases,
  add_missing_cases_to_run,
  testRailUpdateInterval,
  updateResultAfterEachCase,
  use_existing_run,
  create_new_run,
  status,
} = require(configPath);
const { TEST_RAIL_CONFIG_SCHEMA } = require("../constants/json_schema")


const logger = getLogger();


class ConfigManager
{ 

	_createdRunId
	_createdRunUrl
	constructor()
	{
		this.testRailConfigs = 
		{
			base_url: base_url,
			user: user,
			pass: pass,
			project_id: project_id,

			suite_id: suite_id,
			add_missing_cases_to_run: add_missing_cases_to_run,
			create_missing_cases: create_missing_cases,
			testRailUpdateInterval: testRailUpdateInterval,

			updateResultAfterEachCase: updateResultAfterEachCase,
			use_existing_run: use_existing_run,
			create_new_run: create_new_run,
			status: status,
		};
		this.validateConfig()
	}

	validateConfig() 
	{
		try 
		{
			TEST_RAIL_CONFIG_SCHEMA.validate(this.testRailConfigs)	
		} 
		catch (error) 
		{
			throw new Error(`Tes Rail Config is incorrect for more details check error :: ${error}`)
		}
	}

	setCreatedRunId(runId)
	{
		_createdRunId =  runId
	}

	setRunUrl(url)
	{
		_createdRunUrl =  url
	}

	getBaseUrl() { return this.config.base_url; }
	getUser() { return this.config.user; }
	getPass() { return this.config.pass; }
	getProjectId() { return this.config.project_id; }

	getSuiteId() { return this.config.suite_id; }
	getCreateMissingCases() { return this.config.create_missing_cases; }
	getAddMissingCasesToRun() { return this.config.add_missing_cases_to_run; }
	getTestRailUpdateInterval() { return this.config.testRailUpdateInterval; }

	getUpdateResultAfterEachCase() { return this.config.updateResultAfterEachCase; }
	getExistingRunId() { return this.config.use_existing_run.id; }
	getCreatedRunId() { return this._createdRunId; }
	getCreateNewRunIncludeAll() { return this.config.create_new_run.include_all; }
	getCreateNewRunRunName() { return this.config.create_new_run.run_name; }

	getCreateNewRunMilestoneId() { return this.config.create_new_run.milestone_id; }
	getStatusPassed() { return this.config.status.passed; }
	getStatusFailed() { return this.config.status.failed; }
	getStatusUntested() { return this.config.status.untested; }

	getStatusPending() { return this.config.status.pending; }
	getStatusSkipped() { return this.config.status.skipped; }
	getStatusExpFail() { return this.config.status.expFail; }
	getStatusFixed() { return this.config.status.fixed; }

	getStatus(key) { return this.config.status[key];}
	getCreatedRunUrl(key) { return this._createdRunUrl;}
	getCreateMissingCases() { return this.testRailConfigs.create_missing_cases; }
}


module.exports = 
{
  ConfigManager
};