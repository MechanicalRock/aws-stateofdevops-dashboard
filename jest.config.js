module.exports = {
    collectCoverageFrom: ["src/*.{js,jsx,ts,tsx}"],
    coverageThreshold: {
        global: {
            branches: 100,
            functions: 100,
            lines: 100,
            statements: 100,
        },
    },
    collectCoverageFrom: ["**/*.ts?(x)", "**/*.js?(x)"],
    testMatch: ["**/?(*.)(spec|test).ts?(x)", "**/?(*.)(spec|test).js?(x)", "**/*.steps.ts?(x)"],
    testEnvironment: "node",
    testURL: "http://localhost",
    // testPathIgnorePatterns: ["src/*.d.{js,jsx,ts,tsx}"],
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
