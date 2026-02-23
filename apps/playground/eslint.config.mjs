import nextConfig from "eslint-config-next";
import tseslint from "typescript-eslint";

const eslintConfig = [
  // Use the flat config that ships with Next.js 16
  ...nextConfig,
  // Override specific rules for certain files
  {
    files: ["next.config.mjs"],
    rules: {
      "@typescript-eslint/no-require-imports": "off", // In case you revert to `require()`
    },
  },
  {
    files: ["**/*.{ts,tsx}"],
    plugins: {
      "@typescript-eslint": tseslint.plugin,
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-unused-expressions": "off"
    }
  },
  {
    ignores: ["public/**"],
  },
  {
    rules: {
      "@next/next/inline-script-id": "off",
      "react/no-unescaped-entities": "off", // Disable React entity escaping rule
      "prefer-const": "off",
      "react-hooks/exhaustive-deps": "warn",
      "react-hooks/set-state-in-effect": "warn"
    }
  }
];

export default eslintConfig;