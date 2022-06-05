module.exports = {
    parser: "@typescript-eslint/parser",
    parserOptions: {
      ecmaVersion: 2020,
      sourceType: "module"
    },
    extends: [
      "plugin:@typescript-eslint/recommended", // recommended rules from the @typescript-eslint/eslint-plugin
      "plugin:prettier/recommended" // Enables eslint-plugin-prettier and eslint-config-prettier. This will display prettier errors as ESLint errors. Make sure this is always the last configuration in the extends array.
    ],
    plugins: [
      "objects"
    ],
    rules: {
      "objects/no-object-properties-first-line": 1,
      "objects/no-object-properties-last-line": 1
    }
  };