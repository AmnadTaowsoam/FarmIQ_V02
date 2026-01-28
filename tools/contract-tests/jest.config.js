module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/pacts/**/*.test.ts'],
  collectCoverageFrom: ['**/*.ts', '!**/*.test.ts'],
  coverageDirectory: 'coverage',
  verbose: true,
}
