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
  {
    // Bewusst deaktivierte Advisory-Regeln (kein Korrektheits-/Laufzeitproblem):
    rules: {
      // Diese App rendert durchweg dynamische CMS-/Nutzer-Medien (Upload-URLs,
      // Logo, Story-Bilder) mit unbekannten Dimensionen, per CSS skaliert. Hier
      // ist <img> die korrekte Wahl; eine next/image-Konvertierung brächte
      // Layout-Risiken ohne realen Nutzen. (Perf-Advisory, keine Korrektheit.)
      "@next/next/no-img-element": "off",
      // React-Compiler-Advisory für react-hook-form (useForm): die Bibliothek
      // funktioniert zur Laufzeit einwandfrei, ist nur nicht compiler-memoisierbar.
      "react-hooks/incompatible-library": "off",
    },
  },
];

export default eslintConfig;
