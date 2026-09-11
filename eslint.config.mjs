import { defineConfig } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// The globalIgnores block that used to sit here restated eslint-config-next's
// own defaults (.next, out, build, next-env.d.ts) verbatim, so it was a no-op.
const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
]);

export default eslintConfig;
