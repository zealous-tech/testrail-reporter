const CallerVitest = require("./caller-vitest");
const CallerPlaywright = require("./caller-playwright");
const CallerJest = require("./caller-jest");
const CallerMocha = require("./caller-cypress-mocha");

module.exports = {
    CallerVitest,
    CallerPlaywright,
    CallerJest,
    CallerMocha,
};