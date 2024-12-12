const fs = require('fs');
const TestRail = require("@dlenroc/testrail");
const path = require("path");
const getLogger = require("../../src/logger.js");
const logger = getLogger();
let filepath = 'testrail_data_1.json';
require('dotenv').config();

tr_api = new TestRail({
    host: process.env.TESTRAIL_HOST,
    username: process.env.TESTRAIL_USERNAME,
    password: process.env.TESTRAIL_PASSWORD,
});

async function exportAllData(filepath = filepath) {
    let allData = { projects: [] };

    try {
        let projects = await tr_api.getProjects();

        for (let project of projects) {
            logger.info(`Fetching data for project: ${project.name}`);

            let projectData = { ...project, suites: [] };

            if (project.suite_mode === 1) {
                logger.info(`Project "${project.name}" uses "Single repository for all cases" (suite_mode = 1).`);
                try {
                    let sections = await tr_api.getSections(project.id);
                    let suiteData = { suite: "Default Suite", sections: [] };

                    for (let section of sections) {
                        logger.info(`Fetching cases for Section: ${section.name} (ID: ${section.id})`);
                        try {
                            let cases = await tr_api.getCases(project.id, { section_id: section.id });
                            suiteData.sections.push({ section: section.name, cases });
                        } catch (error) {
                            logger.error(`Error fetching cases for section: ${section.name}`, error);
                        }
                    }

                    projectData.suites.push(suiteData);
                } catch (error) {
                    logger.error(`Error fetching sections for project: ${project.name}`, error);
                }
            } else if (project.suite_mode === 2) {
                logger.info(`Project "${project.name}" uses "Single repository with baseline support" (suite_mode = 2).`);
                try {
                    let suites = await tr_api.getSuites(project.id);
                    for (let suite of suites) {
                        logger.info(`Fetching sections for Suite: ${suite.name} (ID: ${suite.id})`);
                        try {
                            let sections = await tr_api.getSections(project.id, { suite_id: suite.id });
                            let suiteData = { suite: suite.name, sections: [] };

                            for (let section of sections) {
                                logger.info(`Fetching cases for Section: ${section.name} (ID: ${section.id})`);
                                try {
                                    let cases = await tr_api.getCases(project.id, { suite_id: suite.id, section_id: section.id });
                                    suiteData.sections.push({ section: section.name, cases });
                                } catch (error) {
                                    logger.error(`Error fetching cases for section: ${section.name}`, error);
                                }
                            }

                            projectData.suites.push(suiteData);
                        } catch (error) {
                            logger.error(`Error fetching sections for suite: ${suite.name}`, error);
                        }
                    }
                } catch (error) {
                    logger.error(`Error fetching suites for project: ${project.name}`, error);
                }
            } else if (project.suite_mode === 3) {
                logger.info(`Project "${project.name}" uses "Multiple test suites to manage cases" (suite_mode = 3).`);
                try {
                    let suites = await tr_api.getSuites(project.id);
                    for (let suite of suites) {
                        logger.info(`Fetching sections for Suite: ${suite.name} (ID: ${suite.id})`);
                        try {
                            let sections = await tr_api.getSections(project.id, { suite_id: suite.id });
                            let suiteData = { suite: suite.name, sections: [] };

                            for (let section of sections) {
                                logger.info(`Fetching cases for Section: ${section.name} (ID: ${section.id})`);
                                try {
                                    let cases = await tr_api.getCases(project.id, { suite_id: suite.id, section_id: section.id });
                                    suiteData.sections.push({ section: section.name, cases });
                                } catch (error) {
                                    logger.error(`Error fetching cases for section: ${section.name}`, error);
                                }
                            }

                            projectData.suites.push(suiteData);
                        } catch (error) {
                            logger.error(`Error fetching sections for suite: ${suite.name}`, error);
                        }
                    }
                } catch (error) {
                    logger.error(`Error fetching suites for project: ${project.name}`, error);
                }
            } else {
                logger.error(`Unknown suite mode (${project.suite_mode}) for project: ${project.name}`);
            }

            allData.projects.push(projectData);
        }

        fs.writeFileSync(filepath, JSON.stringify(allData, null, 4));
        logger.info(`All data exported to "${filepath}".`);
    } catch (error) {
        logger.error("Error fetching data:", error);
    }
}


const args = process.argv.slice(2);
for (let i = 0; i < args.length; i++) {
    if (args[i] === '-f' && args[i + 1]) {
        filepath = args[i + 1];
        i++;
    }
}
exportAllData(filepath);
