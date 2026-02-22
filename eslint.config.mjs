import tseslintParser from "@typescript-eslint/parser";

export default [
  {
    ignores: [".next/**", "node_modules/**"]
  },
  {
    files: ["**/*.{js,mjs,cjs,jsx}"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module"
    },
    rules: {}
  },
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      parser: tseslintParser
    },
    rules: {}
  }
];
