const CallerVitest = require("./caller-vitest");
const CallerPlaywright = require("./caller-playwright");
const CallerJest = require("./caller-jest");
const MochaCaller = require("./caller-cypress-mocha");

module.exports = {
    CallerVitest,
    CallerPlaywright,
    CallerJest,
    MochaCaller,
};