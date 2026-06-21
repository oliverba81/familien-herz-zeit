import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

// Vitest-Konfiguration: ESM-nativ, löst den `@/*`-Alias über vite-tsconfig-paths
// (gleiche Auflösung wie tsconfig.json).
// - Pure Logik unter src/lib/** läuft im Default-`node`-Environment.
// - Komponenten-Smoke-Tests (src/components/**/*.test.tsx) wählen jsdom per
//   Docblock `// @vitest-environment jsdom` in der jeweiligen Testdatei.
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    globals: true,
    setupFiles: ["src/test/setup-dom.ts"],
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    coverage: {
      provider: "v8",
      include: ["src/lib/**/*.ts"],
      exclude: ["src/lib/**/*.test.ts"],
    },
  },
});
