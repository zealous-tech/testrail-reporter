const path = require('path');
const getLogger = require('../logger');
const logger = getLogger();

const { TEST_RAIL_CONFIG_SCHEMA } = require('../constants/jsonSchema');

const DEFAULT_CONFIG_FILENAME = 'testrail.config.js';

class ConfigManager {
	constructor(customPath) {
		const configPath = path.resolve(process.cwd(), customPath || DEFAULT_CONFIG_FILENAME);
		const raw = require(configPath);

		// ENV overrides
		const env = process.env;
		const merged = {
			...raw,
			base_url: env.TR_BASE_URL || raw.base_url,
			user: env.TR_USER || raw.user,
			pass: env.TR_PASS || raw.pass,
			project_id: Number(env.TR_PROJECT_ID ?? raw.project_id),
			suite_id: Number(env.TR_SUITE_ID ?? raw.suite_id),
			testRailUpdateInterval: Number(env.TR_UPDATE_INTERVAL ?? raw.testRailUpdateInterval),
			updateResultAfterEachCase:
				env.TR_UPDATE_AFTER_EACH ? env.TR_UPDATE_AFTER_EACH === 'true' : raw.updateResultAfterEachCase,
			use_existing_run: {
				...raw.use_existing_run,
				id: Number(env.TR_USE_RUN_ID ?? raw.use_existing_run?.id),
			},
			create_new_run: {
				...raw.create_new_run,
				include_all: env.TR_RUN_INCLUDE_ALL ? env.TR_RUN_INCLUDE_ALL === 'true' : raw.create_new_run?.include_all,
				run_name: env.TR_RUN_NAME || raw.create_new_run?.run_name,
				milestone_id: env.TR_MILESTONE_ID ? Number(env.TR_MILESTONE_ID) : raw.create_new_run?.milestone_id ?? null,
			},
			status: {
				// normalize keys to the ones we’ll use everywhere
				passed: raw.status?.passed ?? raw.status?.pass,
				failed: raw.status?.failed ?? raw.status?.fail,
				skipped: raw.status?.skipped,
				untested: raw.status?.untested,
				pending: raw.status?.pending,
				expFail: raw.status?.expFail,
				fixed: raw.status?.fixed,
			},
		};

		const { error } = TEST_RAIL_CONFIG_SCHEMA.validate(merged, { abortEarly: false });
		if (error) {
			throw new Error(`Invalid TestRail config:\n${error}`);
		}

		this.testRailConfigs = merged;

		/**
		 * Runtime state for a run created by this process.
		 * @type {{ id: number|null, url: string|null } | null}
		 */
		this._activeRun = null;

		if (this.testRailConfigs.use_existing_run.id !== 0) {
			this.setRunId(this.testRailConfigs.use_existing_run.id);
		}
	}

	/**
	 * @param {{ id?: number|null, url?: string|null }} run
	 */
	setRun(run) {
		if (!run || (run.id == null && run.url == null)) {
			logger.warn('setRun called without id or url; ignoring.');
			return;
		}
		const prev = this._activeRun ?? { id: null, url: null };
		this._activeRun = {
			id: run.id != null ? Number(run.id) : prev.id,
			url: run.url != null ? String(run.url) : prev.url,
		};
	}

	setRunUrl(url) {
		this.setRun({ url });
	}

	setRunId(id) {
		this.setRun({ id });
	}

	// generic getters
	get(key) { return this.testRailConfigs[key]; }
	getStatus(key) { return this.testRailConfigs.status[key]; }

	// convenience
	get baseUrl() { return this.testRailConfigs.base_url; }
	get user() { return this.testRailConfigs.user; }
	get pass() { return this.testRailConfigs.pass; }
	get projectId() { return this.testRailConfigs.project_id; }
	get suiteId() { return this.testRailConfigs.suite_id; }
	get statuses() { return this.testRailConfigs.status; }

	// flags
	get createMissingCases() { return this.testRailConfigs.create_missing_cases; }
	get addMissingCasesToRun() { return this.testRailConfigs.add_missing_cases_to_run; }
	get updateInterval() { return this.testRailConfigs.testRailUpdateInterval; }
	get updateAfterEach() { return this.testRailConfigs.updateResultAfterEachCase; }

	// run settings
	get useExistingRun() { return this.testRailConfigs.use_existing_run; }
	get createNewRun() { return this.testRailConfigs.create_new_run; }

	/**
	 * @returns {{ id: number|null, url: string|null } | null}
	 */
	get activeRun() { return this._activeRun; }
	get activeRunId() { return this._activeRun.id; }
	get activeRunUrl() { return this._activeRun?.url ?? ""; }

}

let __instance;
function getConfigManager(customPath) {
	if (!__instance) __instance = new ConfigManager(customPath);
	return __instance;
}

module.exports = { getConfigManager, ConfigManager };
