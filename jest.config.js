const { getJestProjects } = require('@nx/jest');

module.exports = {
  projects: getJestProjects(),
  coverageReporters: ['text', 'lcov', 'html'],
  collectCoverageFrom: [
    'apps/**/*.{ts,tsx}',
    'libs/**/*.{ts,tsx}',
    '!**/*.spec.{ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/dist/**',
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
};
