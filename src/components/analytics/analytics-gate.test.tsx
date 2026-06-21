// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render } from "@testing-library/react";
import AnalyticsGate from "./analytics-gate";
import { getConsentFromCookie } from "@/lib/consent/storage";

// next/navigation usePathname + Consent-Storage werden gemockt, damit das
// Gating-Verhalten deterministisch geprueft werden kann.
let mockPathname = "/";
vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
}));
vi.mock("@/lib/consent/storage", () => ({
  getConsentFromCookie: vi.fn(),
}));
// next/script auf ein erkennbares Element reduzieren.
vi.mock("next/script", () => ({
  default: (props: Record<string, unknown>) => (
    <div data-testid="next-script" data-script-id={props.id as string} />
  ),
}));

const mockedConsent = vi.mocked(getConsentFromCookie);

function setConsent(statistics: boolean | null) {
  if (statistics === null) {
    mockedConsent.mockReturnValue(null as never);
  } else {
    mockedConsent.mockReturnValue({ statistics } as never);
  }
}

describe("AnalyticsGate (Gating-Verhalten)", () => {
  beforeEach(() => {
    mockPathname = "/";
    setConsent(true);
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it("rendert nichts im Admin-Bereich", () => {
    mockPathname = "/admin/kurse";
    vi.stubEnv("NEXT_PUBLIC_ANALYTICS_PROVIDER", "matomo");
    const { container } = render(<AnalyticsGate />);
    expect(container).toBeEmptyDOMElement();
  });

  it("rendert nichts ohne Statistik-Consent", () => {
    setConsent(false);
    vi.stubEnv("NEXT_PUBLIC_ANALYTICS_PROVIDER", "matomo");
    const { container } = render(<AnalyticsGate />);
    expect(container).toBeEmptyDOMElement();
  });

  it("rendert nichts, wenn Provider 'none' ist", () => {
    vi.stubEnv("NEXT_PUBLIC_ANALYTICS_PROVIDER", "none");
    const { container } = render(<AnalyticsGate />);
    expect(container).toBeEmptyDOMElement();
  });

  it("rendert das Matomo-Script bei Consent + Provider matomo", () => {
    vi.stubEnv("NEXT_PUBLIC_ANALYTICS_PROVIDER", "matomo");
    vi.stubEnv("NEXT_PUBLIC_MATOMO_URL", "https://matomo.example/");
    vi.stubEnv("NEXT_PUBLIC_MATOMO_SITE_ID", "1");
    const { getByTestId } = render(<AnalyticsGate />);
    expect(getByTestId("next-script")).toHaveAttribute("data-script-id", "matomo");
  });

  it("rendert das GA4-Script bei Consent + Provider ga4", () => {
    vi.stubEnv("NEXT_PUBLIC_ANALYTICS_PROVIDER", "ga4");
    vi.stubEnv("NEXT_PUBLIC_GA4_ID", "G-TEST");
    const { container } = render(<AnalyticsGate />);
    // GA4 rendert zwei Script-Tags (Loader + Inline-Config).
    expect(container.querySelectorAll('[data-testid="next-script"]').length).toBeGreaterThanOrEqual(1);
  });
});
