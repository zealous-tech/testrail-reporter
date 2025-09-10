const constants = require('./constants');
const filePaths = require('./filePaths');
const jsonSchema = require('./jsonSchema');

module.exports = {
  ...constants,
  ...filePaths,
  ...jsonSchema
};