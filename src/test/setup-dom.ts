// Registriert die @testing-library/jest-dom-Matcher (z. B. toBeInTheDocument)
// fuer Vitest. Wird global als setupFile geladen; die Matcher greifen nur in
// jsdom-Tests, sind in node-Tests aber harmlos (reine expect-Erweiterung).
import "@testing-library/jest-dom/vitest";
