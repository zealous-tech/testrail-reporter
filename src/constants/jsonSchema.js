const Joi = require('joi')


const isPlaywright =
  process?.env?.npm_lifecycle_script?.includes("playwright");


const TEST_RAIL_CONFIG_SCHEMA = Joi.object
	({
		base_url: Joi.string()
			.uri({ scheme: ['http', 'https'] })
			.required(),

		user: Joi.string().email().required(),
		pass: Joi.string().min(1).required(),
		project_id: Joi.number().integer().positive().required(),
		suite_id: Joi.number().integer().positive().required(),

		create_missing_cases: Joi.boolean().required(),
		add_missing_cases_to_run: Joi.boolean().required(),
		testRailUpdateInterval: Joi.number().integer().min(0).required(),
		
		updateResultAfterEachCase: isPlaywright
			? Joi.boolean().required()
			: Joi.boolean().optional(),

		use_existing_run: Joi.object
			({
				id: Joi.number().integer().min(0).required(),
			}).required(),

		create_new_run: Joi.object
			({
				include_all: Joi.boolean().required(),
				run_name: Joi.string().min(1).required(),
				milestone_id: Joi.number().integer().min(0).allow(null).optional()
			}).required(),

		status: Joi.object().pattern(Joi.string(), Joi.number().integer().min(0)).required(),
	})


module.exports = {
	TEST_RAIL_CONFIG_SCHEMA
}
