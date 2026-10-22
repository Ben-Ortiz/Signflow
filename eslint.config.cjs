const js = require("@eslint/js");
const globals = require("globals");

module.exports = [
  { ignores: ["node_modules/**"] },
  js.configs.recommended,
  {
    files: ["js/**/*.js"],
    languageOptions: {
      sourceType: "script",
      globals: {
        ...globals.browser,
        pdfjsLib: "readonly",
        PDFLib: "readonly",
        SignFlowCore: "readonly",
        SignFlowExport: "readonly",
      },
    },
  },
  {
    files: ["js/core.js", "**/*.cjs"],
    languageOptions: { globals: globals.node },
  },
  {
    rules: {
      eqeqeq: ["error", "always"],
      "no-var": "error",
      "prefer-const": "error",
      "no-unused-vars": [
        "error",
        { caughtErrors: "none", argsIgnorePattern: "^_" },
      ],
    },
  },
];
