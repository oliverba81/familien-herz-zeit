// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import AdminSidebar from "./admin-sidebar";

// Abhaengigkeiten mocken, damit die Komponente isoliert (DB-frei) rendert.
let mockPathname = "/admin/pages";
vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
}));
vi.mock("next-auth/react", () => ({
  useSession: () => ({ data: { user: { role: "ADMIN" } } }),
  signOut: vi.fn(),
}));
vi.mock("./app-version", () => ({ default: () => null }));
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

function navByLabel(label: string) {
  // Liefert den Toggle-Button einer Menügruppe anhand ihres Labels.
  return screen.getByRole("button", { name: new RegExp(label) });
}

describe("AdminSidebar (gemischter State: Pathname-abgeleitet + Toggle)", () => {
  beforeEach(() => {
    mockPathname = "/admin/pages";
  });

  it("öffnet initial das zum Pfad passende Untermenü (abgeleiteter State)", () => {
    render(<AdminSidebar />);
    // /admin/pages -> Gruppe "Content" offen -> Item "Seiten" sichtbar.
    expect(screen.getByRole("link", { name: /Seiten/ })).toBeInTheDocument();
    // Eine Gruppe einer anderen Sektion ist NICHT offen.
    expect(screen.queryByRole("link", { name: /Videokurse/ })).not.toBeInTheDocument();
  });

  it("schaltet ein Untermenü per Klick um (user-gesteuerter State)", () => {
    render(<AdminSidebar />);
    // "Kurse"-Gruppe öffnen -> Videokurse erscheint.
    fireEvent.click(navByLabel("Kurse"));
    expect(screen.getByRole("link", { name: /Videokurse/ })).toBeInTheDocument();
    // Erneuter Klick schließt sie wieder.
    fireEvent.click(navByLabel("Kurse"));
    expect(screen.queryByRole("link", { name: /Videokurse/ })).not.toBeInTheDocument();
  });

  it("Toggle überschreibt den abgeleiteten Zustand (Content schließen ist möglich)", () => {
    render(<AdminSidebar />);
    expect(screen.getByRole("link", { name: /Seiten/ })).toBeInTheDocument();
    // Initial offene "Content"-Gruppe per Klick schließen.
    fireEvent.click(navByLabel("Content"));
    expect(screen.queryByRole("link", { name: /Seiten/ })).not.toBeInTheDocument();
  });
});
