const baseJestConfig = require('./jest.config.base');
const {
  merge
} = require('lodash');

module.exports = merge(baseJestConfig, {
  "collectCoverage": false,
  "testRegex": "/__tests__/.*\\.spec\\.(js)$"
});