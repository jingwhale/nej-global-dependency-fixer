const baseJestConfig = require('./jest.config.base');
const {
  merge
} = require('lodash');

module.exports = merge(baseJestConfig, {
  "collectCoverage": true,
  "collectCoverageFrom": [
    "**/*.{ts}",
    "!**/__tests__/**",
    "!**/node_modules/**"
  ],
  "transform": {
    ".(ts|tsx)": "<rootDir>/node_modules/ts-jest/preprocessor.js"
  },
  "testRegex": "/__tests__/.*\\.spec\\.(ts)$",
});