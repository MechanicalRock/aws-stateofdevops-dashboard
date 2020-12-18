module.exports = {
    plugins: [
        "@babel/proposal-class-properties",
        [
            "@babel/plugin-transform-runtime",
            {
                regenerator: true,
            },
        ],
    ],
    presets: [
        [
            "@babel/env",
            {
                targets: {
                    node: "current",
                },
                modules: "commonjs",
            },
        ],
        "@babel/typescript",
    ],
    // env: {
    //     test: {
    //         plugins: ["istanbul"],
    //     },
    // },
};
