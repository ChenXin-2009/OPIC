import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "node_modules/**",
  ]),
  {
    rules: {
      // 复杂度规则 - 限制圈复杂度为 10
      "complexity": ["error", { "max": 10 }],
      
      // 代码质量规则
      "max-lines-per-function": ["warn", { "max": 100, "skipBlankLines": true, "skipComments": true }],
      "max-depth": ["warn", { "max": 4 }],
      "max-nested-callbacks": ["warn", { "max": 3 }],
      "max-params": ["warn", { "max": 5 }],
      
      // 错误处理规则
      "no-throw-literal": "error",
      "prefer-promise-reject-errors": "error",
      
      // 代码组织规则
      "no-duplicate-imports": "error",
      "sort-imports": ["warn", {
        "ignoreCase": true,
        "ignoreDeclarationSort": true,
        "ignoreMemberSort": false,
        "memberSyntaxSortOrder": ["none", "all", "multiple", "single"]
      }],
      
      // TypeScript 特定规则
      "@typescript-eslint/explicit-function-return-type": ["warn", {
        "allowExpressions": true,
        "allowTypedFunctionExpressions": true,
        "allowHigherOrderFunctions": true
      }],
      "@typescript-eslint/no-unused-vars": ["error", {
        "argsIgnorePattern": "^_",
        "varsIgnorePattern": "^_"
      }],
      "@typescript-eslint/no-explicit-any": "warn",
    }
  }
]);

export default eslintConfig;
