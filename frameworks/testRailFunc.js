import TestRail from "@dlenroc/testrail";

export class TestRailFunc {
  constructor(config) {
    this.base_url = config.base_url;
    this.user = config.user;
    this.pass = config.pass;
    this.project_id = config.project_id;
    this.suite_id = config.suite_id;

    this.testrail = new TestRail({
      host: this.base_url,
      user: this.user,
      password: this.pass,
    });
  }
  // Retrieves a specific test run by its ID
  async getRun(runID) {
    try {
      const run = await this.testrail.getRun(runID);
      return run;
    } catch (error) {
      console.log("Error :::: ", error.message);
    }
  }
  // Retrieves all test runs for the current project
  async getRuns() {
    try {
      const runs = await this.testrail.getRuns(this.project_id);
      return runs;
    } catch (error) {
      console.log("Error :::: ", error.message);
    }
  }
  // Deletes one or more test runs by their IDs
  async deleteRun(runIds) {
    try {
      let result = [];

      if (Array.isArray(runIds)) {
        result = await Promise.all(
          runIds.map(async (id) => this.testrail.deleteRun(id))
        );
      } else {
        result.push(await this.testrail.deleteRun(runIds));
      }
      return result;
    } catch (error) {
      console.log("Error ::: ", error);
    }
  }
}
