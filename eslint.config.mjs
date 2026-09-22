import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// The globalIgnores block that used to sit here restated eslint-config-next's
// own defaults (.next, out, build, next-env.d.ts) verbatim, so it was a no-op.
// This one is not: src/generated holds the Prisma client, which is machine
// written, regenerated on every install, and not ours to lint.
const eslintConfig = defineConfig([
  globalIgnores(["src/generated/**"]),
  ...nextVitals,
  ...nextTs,
]);

export default eslintConfig;
