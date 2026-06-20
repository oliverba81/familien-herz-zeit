import nextCoreWebVitals from "eslint-config-next/core-web-vitals";

// Next.js 16 hat `next lint` entfernt; ESLint läuft direkt über die ESLint-CLI
// mit Flat-Config. eslint-config-next ab v16 liefert eine native Flat-Config,
// die hier direkt eingebunden wird (kein FlatCompat nötig).
const eslintConfig = [
  {
    ignores: [
      ".next/**",
      ".next.new/**",
      "node_modules/**",
      "src/generated/**",
      "scripts/**",
      "next-env.d.ts",
    ],
  },
  ...nextCoreWebVitals,
];

export default eslintConfig;
