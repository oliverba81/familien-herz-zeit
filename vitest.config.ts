import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

// Vitest-Konfiguration: ESM-nativ, löst den `@/*`-Alias über vite-tsconfig-paths
// (gleiche Auflösung wie tsconfig.json). Getestet werden ausschließlich pure
// Funktionen unter src/lib/** — keine DB, kein Netzwerk. Daher reicht das
// Node-Environment ohne jsdom.
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    globals: true,
    include: ["src/**/*.test.ts"],
    // Coverage nur auf der getesteten Geschäftslogik, nicht auf UI/Routen.
    coverage: {
      provider: "v8",
      include: ["src/lib/**/*.ts"],
      exclude: ["src/lib/**/*.test.ts"],
    },
  },
});
