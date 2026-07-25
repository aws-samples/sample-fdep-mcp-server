import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    files: ["core/**/*.ts", "adapters/**/*.ts"],
    extends: [tseslint.configs.recommended],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
    },
  },
  {
    ignores: ["node_modules/", "core/dist/", "**/*.js", "**/*.mjs"],
  },
);
