import js from "@eslint/js";

export default [
  {
    ignores: ["dist/**", "dist-action/**", "node_modules/**", "coverage/**"]
  },
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        Buffer: "readonly",
        console: "readonly",
        process: "readonly",
        URL: "readonly"
      }
    },
    rules: {
      "no-console": "off"
    }
  }
];
