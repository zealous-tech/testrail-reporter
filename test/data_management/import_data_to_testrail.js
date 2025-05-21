const fs = require('fs');
const TestRail = require("@dlenroc/testrail");
const path = require("path");
const getLogger = require("../../src/logger.js");
const logger = getLogger();
let filepath = 'testrail_data.json';
require('dotenv').config();

tr_api = new TestRail({
    host: process.env.TESTRAIL_HOST,
    username: process.env.TESTRAIL_USERNAME,
    password: process.env.TESTRAIL_PASSWORD,
});

async function importAllData(filepath = filepath) {
    try {
        if (!fs.existsSync(filepath)) {
            logger.error(`The provided path does not exist: ${filepath}`);
        }
        if (!fs.statSync(filepath).isFile()) {
            logger.error(`The provided path is not a file: ${filepath}`);
        }
        const data = JSON.parse(fs.readFileSync(filepath, 'utf8'));
        logger.info(`\nStarting import process from "${filepath}"`);

        for (let project of data.projects) {
            logger.info(`\nImporting project: ${project.name}`);
            let createdProject;
            try {
                createdProject = await tr_api.addProject({
                    name: project.name,
                    announcement: project.announcement,
                    show_announcement: project.show_announcement,
                    suite_mode: project.suite_mode,
                });
                logger.info(`\nProject created: ${createdProject.name}`);
            } catch (error) {
                logger.error(`Error creating project: ${project.name}`, error);
                continue;
            }

            if (project.suite_mode === 1) {
                // continue;
                // Suite Mode 1: Single repository, no suites
                // logger.info(`Suite mode 1: Project "${project.name}" supports only a single suite.`);
                const suite = project.suites[0]; // Single suite expected in mode 1
                await importSectionsAndCases(createdProject.id, null, suite.sections);
            } else if (project.suite_mode === 2) {
                // Suite Mode 2: Single repository with baseline support
                logger.info(`\nSuite mode 2: Project "${project.name}" supports a Master suite with baselines.`);
                let masterSuite;
                try {
                    // Fetch the default Master suite for this project
                    masterSuite = (await tr_api.getSuites(createdProject.id))[0];
                    logger.info(`\nMaster suite identified: ${masterSuite.name} (ID: ${masterSuite.id})`);
                } catch (error) {
                    logger.error(`\nError fetching Master suite for project: ${project.name}`, error);
                    continue;
                }

                for (let suite of project.suites) {
                    // Use the Master suite ID for all sections
                    await importSectionsAndCases(createdProject.id, masterSuite.id, suite.sections);
                }
            } else if (project.suite_mode === 3) {
                // continue;
                // Suite Mode 3: Multiple suites
                // logger.info(`Suite mode 3: Project "${project.name}" supports multiple suites.`);
                for (let suite of project.suites) {
                    let createdSuite;
                    try {
                        createdSuite = await tr_api.addSuite(createdProject.id, {
                            name: suite.suite,
                        });
                        // logger.info(`Suite created: ${createdSuite.name}`);
                    } catch (error) {
                        // logger.error(`Error creating suite: ${suite.suite} in project: ${project.name}`, error);
                        continue;
                    }

                    await importSectionsAndCases(createdProject.id, createdSuite.id, suite.sections);
                }
            }
        }

        logger.info("\nAll data imported successfully.");
    } catch (error) {
        logger.error("\nError during import process:\n", error);
    }
}

async function importSectionsAndCases(projectId, suiteId, sections) {
    for (let section of sections) {
        let createdSection;
        try {
            createdSection = await tr_api.addSection(projectId, {
                name: section.section,
                // null suite_id for suite_mode 1 or 2
                suite_id: suiteId || undefined,
            });
            logger.info(`\nSection created: ${createdSection.name}`);
        } catch (error) {
            logger.error(`\nError creating section: ${section.section}`, error);
            continue;
        }

        for (let testCase of section.cases) {
            try {
                await tr_api.addCase(createdSection.id, {
                    title: testCase.title,
                    template_id: testCase.template_id,
                    type_id: testCase.type_id,
                    priority_id: testCase.priority_id,
                    estimate: testCase.estimate,
                    milestone_id: testCase.milestone_id,
                    refs: testCase.refs,
                });
                logger.info(`\nTest case created: ${testCase.title}`);
            } catch (error) {
                logger.error(`\nError creating test case: ${testCase.title}`, error);
            }
        }
    }
}

const args = process.argv.slice(2);
for (let i = 0; i < args.length; i++) {
    if (args[i] === '-f' && args[i + 1]) {
        filepath = args[i + 1];
        i++;
    }
}

importAllData(filepath);
