module.exports = {
    coverageThreshold: {
        global: {
            branches: 80,
            functions: 80,
            lines: 80,
            statements: 80,
        },
    },
    collectCoverageFrom: ["**/*.ts?(x)", "**/*.js?(x)", "!**/*d.(ts|js)?(x)", "!**/alarmEventStore.(ts|js)?(x)"],
    testMatch: ["**/?(*.)(spec|test).ts?(x)", "**/?(*.)(spec|test).js?(x)", "**/*.steps.ts?(x)"],
    testEnvironment: "node",
    testURL: "http://localhost",
    roots: ["<rootDir>/test/"],
    transformIgnorePatterns: ["[/\\\\]node_modules[/\\\\].+\\.(js|jsx|ts|tsx)$"],
    moduleFileExtensions: ["js", "ts", "tsx", "json", "node"],
    globals: {
        "ts-jest": {
            tsConfigFile: "tsconfig.json",
        },
    },
    verbose: true,
};
