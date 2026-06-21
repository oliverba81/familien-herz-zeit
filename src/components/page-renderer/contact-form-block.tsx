"use client";

import { useState, useEffect } from "react";
import { ContactFormBlockData } from "@/lib/page-builder/types";
import Script from "next/script";

declare global {
  interface Window {
    grecaptcha: any;
  }
}

interface ContactFormBlockProps {
  data: ContactFormBlockData;
}

export default function ContactFormBlock({ data }: ContactFormBlockProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [recaptchaLoaded, setRecaptchaLoaded] = useState(false);
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);
  const [recaptchaWidgetId, setRecaptchaWidgetId] = useState<number | null>(null);

  const {
    name = "ULRIKE BARTHEL",
    role = "HEILPÄDAGOGIN & BABYKURSTRAINERIN",
    address = "Schönborner Str 47\n09661 Rossau",
    phone = "0174 / 837 24 63",
    phoneLink = "tel:+491748372463",
    email = "info@familien-herz-zeit.de",
    emailLink = "mailto:info@familien-herz-zeit.de",
    showOfficeHours = true,
    officeHoursTitle = "SPRECHZEITEN",
    officeHoursText = "Terminanfragen für Themenstunden werden in der Regel innerhalb von 48 Stunden beantwortet.",
    showFirstName = true,
    firstNameLabel = "VORNAME",
    firstNameRequired = true,
    showLastName = true,
    lastNameLabel = "NACHNAME",
    lastNameRequired = true,
    emailLabel = "EMAIL",
    emailRequired = true,
    messageLabel = "NACHRICHT",
    messageRequired = true,
    submitButtonText = "NACHRICHT SENDEN",
    enableRecaptcha = true,
    recaptchaSiteKey,
    layout = "default",
  } = data;

  // reCAPTCHA Site Key aus ENV oder Block-Einstellungen
  const siteKey = recaptchaSiteKey || process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

  // Lade reCAPTCHA wenn aktiviert
  useEffect(() => {
    // Synchronisation mit dem extern geladenen reCAPTCHA-Script (Drittanbieter):
    // markiert das Widget als ladebereit, sobald window.grecaptcha verfügbar ist.
    if (enableRecaptcha && siteKey && typeof window !== "undefined" && window.grecaptcha) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRecaptchaLoaded(true);
    }
  }, [enableRecaptcha, siteKey]);

  // Render reCAPTCHA Widget
  useEffect(() => {
    // Imperatives Initialisieren des reCAPTCHA-Widgets (Drittanbieter-API). Die
    // zurückgegebene Widget-ID wird für späteres reset() benötigt und muss daher
    // im State gehalten werden.
    if (recaptchaLoaded && enableRecaptcha && siteKey && typeof window !== "undefined" && window.grecaptcha) {
      const widgetId = window.grecaptcha.render("recaptcha-container", {
        sitekey: siteKey,
        callback: (token: string) => {
          setRecaptchaToken(token);
        },
        "expired-callback": () => {
          setRecaptchaToken(null);
        },
      });
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRecaptchaWidgetId(widgetId);
    }
  }, [recaptchaLoaded, enableRecaptcha, siteKey]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    // Prüfe reCAPTCHA wenn aktiviert
    if (enableRecaptcha && !recaptchaToken) {
      setError("Bitte bestätige, dass du kein Roboter bist.");
      return;
    }

    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const formObject: Record<string, string> = {};
    formData.forEach((value, key) => {
      formObject[key] = value.toString();
    });

    // Füge reCAPTCHA Token hinzu
    if (enableRecaptcha && recaptchaToken) {
      formObject.recaptchaToken = recaptchaToken;
    }

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formObject),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Fehler beim Absenden der Nachricht");
      }

      setSuccess(true);
      e.currentTarget.reset();
      
      // Reset reCAPTCHA
      if (recaptchaWidgetId !== null && typeof window !== "undefined" && window.grecaptcha) {
        window.grecaptcha.reset(recaptchaWidgetId);
        setRecaptchaToken(null);
      }
    } catch (err: any) {
      setError(err.message || "Fehler beim Absenden der Nachricht");
    } finally {
      setIsLoading(false);
    }
  };

  const gridClass = layout === "stacked" ? "grid-template-columns: 1fr;" : "grid-template-columns: 360px 1fr;";

  return (
    <>
      {enableRecaptcha && siteKey && (
        <Script
          src={`https://www.google.com/recaptcha/api.js?render=explicit`}
          strategy="lazyOnload"
          onLoad={() => {
            if (typeof window !== "undefined" && window.grecaptcha) {
              setRecaptchaLoaded(true);
            }
          }}
        />
      )}
      <section className="fhz-contactForm01" aria-label="Kontaktformular">
        <style jsx>{`
          .fhz-contactForm01 {
            --ink: #0f172a;
            --muted: #6b7a90;
            --accent: #d53a44;
            --border: rgba(15, 23, 42, 0.10);
            --cardBg: #ffffff;
            --soft: #f7fafc;

            background: #fff;
            padding: 28px 18px 48px;
            font-family: Inter, system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif;
            color: var(--ink);
          }

          .fhz-contactForm01__inner {
            width: min(1120px, 100%);
            margin: 0 auto;
          }

          .fhz-contactForm01__grid {
            display: grid;
            ${gridClass}
            gap: 26px;
            align-items: start;
          }

          /* Left side */
          .fhz-contactForm01__card {
            background: var(--cardBg);
            border: 1px solid var(--border);
            border-radius: 34px;
            padding: 22px 22px;
            box-shadow: 0 14px 34px rgba(15, 23, 42, 0.06);
          }

          .fhz-contactForm01__name {
            font-weight: 900;
            font-size: 18px;
            letter-spacing: -0.01em;
            margin-bottom: 6px;
          }

          .fhz-contactForm01__role {
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.12em;
            color: #9aa6b5;
            font-size: 11px;
            line-height: 1.4;
            margin-bottom: 16px;
          }

          .fhz-contactForm01__rows {
            display: grid;
            gap: 14px;
          }

          .fhz-contactForm01__row {
            display: grid;
            grid-template-columns: 42px 1fr;
            gap: 12px;
            align-items: start;
          }

          .fhz-contactForm01__rowIcon {
            width: 42px;
            height: 42px;
            border-radius: 16px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            color: var(--accent);
            background: rgba(213, 58, 68, 0.10);
            border: 1px solid rgba(213, 58, 68, 0.16);
          }

          .fhz-contactForm01__rowLabel {
            font-size: 11px;
            letter-spacing: 0.16em;
            text-transform: uppercase;
            font-weight: 900;
            color: #9aa6b5;
            margin-bottom: 4px;
          }

          .fhz-contactForm01__rowText {
            color: #2a3b52;
            font-weight: 800;
            line-height: 1.35;
            font-size: 14px;
            white-space: pre-line;
          }

          .fhz-contactForm01__rowLink {
            color: #2a3b52;
            font-weight: 800;
            text-decoration: none;
            font-size: 14px;
          }

          .fhz-contactForm01__rowLink:hover {
            text-decoration: underline;
          }

          /* Sprechzeiten note */
          .fhz-contactForm01__note {
            margin-top: 18px;
            border-radius: 34px;
            padding: 20px 22px;
            background: linear-gradient(120deg, #0b1220, #0b1220 55%, rgba(213, 58, 68, 0.18));
            box-shadow: 0 18px 44px rgba(15, 23, 42, 0.14);
            color: #fff;
          }

          .fhz-contactForm01__noteTitle {
            font-size: 11px;
            letter-spacing: 0.22em;
            text-transform: uppercase;
            font-weight: 900;
            opacity: 0.85;
            margin-bottom: 10px;
          }

          .fhz-contactForm01__noteText {
            color: rgba(255, 255, 255, 0.86);
            line-height: 1.55;
            font-size: 13.5px;
          }

          /* Right form card */
          .fhz-contactForm01__formCard {
            background: var(--cardBg);
            border: 1px solid var(--border);
            border-radius: 44px;
            padding: clamp(18px, 3.4vw, 34px);
            box-shadow: 0 18px 44px rgba(15, 23, 42, 0.08);
          }

          .fhz-contactForm01__form {
            display: grid;
            gap: 16px;
          }

          .fhz-contactForm01__rowGrid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 16px;
          }

          .fhz-contactForm01__field {
            display: grid;
            gap: 8px;
          }

          .fhz-contactForm01__label {
            font-size: 11px;
            letter-spacing: 0.18em;
            text-transform: uppercase;
            font-weight: 900;
            color: #9aa6b5;
          }

          .fhz-contactForm01__input,
          .fhz-contactForm01__textarea {
            width: 100%;
            border: 1px solid rgba(15, 23, 42, 0.08);
            background: #f8fafc;
            border-radius: 14px;
            padding: 14px 14px;
            font-size: 14px;
            color: #1b2a41;
            outline: none;
            transition: border-color 0.18s ease, box-shadow 0.18s ease, background 0.18s ease;
            font-family: inherit;
          }

          .fhz-contactForm01__textarea {
            min-height: 180px;
            resize: vertical;
          }

          .fhz-contactForm01__input:focus,
          .fhz-contactForm01__textarea:focus {
            border-color: rgba(213, 58, 68, 0.35);
            box-shadow: 0 0 0 6px rgba(213, 58, 68, 0.10);
            background: #ffffff;
          }

          /* Captcha placeholder row */
          .fhz-contactForm01__captcha {
            border: 1px solid rgba(15, 23, 42, 0.10);
            background: #fff;
            border-radius: 16px;
            padding: 14px 16px;
            display: flex;
            align-items: center;
            gap: 12px;
          }

          .fhz-contactForm01__captchaBox {
            width: 22px;
            height: 22px;
            border-radius: 6px;
            border: 2px solid rgba(15, 23, 42, 0.18);
            background: #fff;
          }

          .fhz-contactForm01__captchaText {
            font-weight: 800;
            color: #2a3b52;
            font-size: 12px;
          }

          .fhz-contactForm01__captchaRight {
            margin-left: auto;
            display: inline-flex;
            align-items: center;
            gap: 8px;
            color: #9aa6b5;
            font-size: 10px;
            letter-spacing: 0.12em;
            text-transform: uppercase;
          }

          .fhz-contactForm01__captchaMini {
            font-weight: 900;
          }

          /* Submit */
          .fhz-contactForm01__submit {
            margin-top: 6px;
            width: 100%;
            border: none;
            border-radius: 18px;
            background: #0b1220;
            color: #fff;
            padding: 16px 18px;
            font-weight: 900;
            letter-spacing: 0.10em;
            text-transform: uppercase;
            cursor: pointer;
            box-shadow: 0 18px 44px rgba(15, 23, 42, 0.18);
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            transition: transform 0.18s ease, box-shadow 0.18s ease, filter 0.18s ease;
            font-family: inherit;
          }

          .fhz-contactForm01__submit:hover:not(:disabled) {
            transform: translateY(-1px);
            box-shadow: 0 22px 52px rgba(15, 23, 42, 0.22);
            filter: brightness(1.02);
          }

          .fhz-contactForm01__submit:disabled {
            opacity: 0.6;
            cursor: not-allowed;
          }

          .fhz-contactForm01__submitIcon {
            display: inline-flex;
            opacity: 0.95;
          }

          /* Error/Success Messages */
          .fhz-contactForm01__message {
            padding: 12px 16px;
            border-radius: 12px;
            font-size: 14px;
            font-weight: 600;
          }

          .fhz-contactForm01__message--error {
            background: #fee2e2;
            color: #991b1b;
            border: 1px solid #fecaca;
          }

          .fhz-contactForm01__message--success {
            background: #d1fae5;
            color: #065f46;
            border: 1px solid #a7f3d0;
          }

          /* Responsive */
          @media (max-width: 980px) {
            .fhz-contactForm01__grid {
              grid-template-columns: 1fr !important;
            }
            .fhz-contactForm01__rowGrid {
              grid-template-columns: 1fr;
            }
          }
        `}</style>
        <div className="fhz-contactForm01__inner">
          <div className="fhz-contactForm01__grid">
            {/* Left column */}
            <aside className="fhz-contactForm01__aside" aria-label="Kontaktdaten">
              <div className="fhz-contactForm01__card">
                {name && <div className="fhz-contactForm01__name">{name}</div>}
                {role && (
                  <div className="fhz-contactForm01__role" dangerouslySetInnerHTML={{ __html: role.replace(/\n/g, "<br/>") }} />
                )}

                <div className="fhz-contactForm01__rows">
                  {address && (
                    <div className="fhz-contactForm01__row">
                      <div className="fhz-contactForm01__rowIcon" aria-hidden="true">
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M12 21s7-6.1 7-12a7 7 0 1 0-14 0c0 5.9 7 12 7 12z" stroke="currentColor" strokeWidth="2" />
                          <path d="M12 10.2a2.2 2.2 0 1 0-2.2-2.2 2.2 2.2 0 0 0 2.2 2.2z" stroke="currentColor" strokeWidth="2" />
                        </svg>
                      </div>
                      <div className="fhz-contactForm01__rowMeta">
                        <div className="fhz-contactForm01__rowLabel">ANSCHRIFT</div>
                        <div className="fhz-contactForm01__rowText">{address}</div>
                      </div>
                    </div>
                  )}

                  {phone && (
                    <div className="fhz-contactForm01__row">
                      <div className="fhz-contactForm01__rowIcon" aria-hidden="true">
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path
                            d="M6 3h3l2 5-2 1c1.2 2.6 3.4 4.8 6 6l1.1-2 5 2v3c0 1.1-.9 2-2 2-9.4 0-17-7.6-17-17 0-1.1.9-2 2-2z"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </div>
                      <div className="fhz-contactForm01__rowMeta">
                        <div className="fhz-contactForm01__rowLabel">TELEFON</div>
                        {phoneLink ? (
                          <a className="fhz-contactForm01__rowLink" href={phoneLink}>
                            {phone}
                          </a>
                        ) : (
                          <div className="fhz-contactForm01__rowText">{phone}</div>
                        )}
                      </div>
                    </div>
                  )}

                  {email && (
                    <div className="fhz-contactForm01__row">
                      <div className="fhz-contactForm01__rowIcon" aria-hidden="true">
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M4 6h16v12H4V6z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                          <path d="M4 7l8 6 8-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                      <div className="fhz-contactForm01__rowMeta">
                        <div className="fhz-contactForm01__rowLabel">EMAIL</div>
                        {emailLink ? (
                          <a className="fhz-contactForm01__rowLink" href={emailLink}>
                            {email}
                          </a>
                        ) : (
                          <div className="fhz-contactForm01__rowText">{email}</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {showOfficeHours && (officeHoursTitle || officeHoursText) && (
                <div className="fhz-contactForm01__note" aria-label="Sprechzeiten">
                  {officeHoursTitle && <div className="fhz-contactForm01__noteTitle">{officeHoursTitle}</div>}
                  {officeHoursText && <div className="fhz-contactForm01__noteText">{officeHoursText}</div>}
                </div>
              )}
            </aside>

            {/* Right column */}
            <div className="fhz-contactForm01__formCard">
              {error && (
                <div className="fhz-contactForm01__message fhz-contactForm01__message--error" role="alert">
                  {error}
                </div>
              )}
              {success && (
                <div className="fhz-contactForm01__message fhz-contactForm01__message--success" role="alert">
                  Vielen Dank für deine Nachricht! Wir melden uns bald bei dir.
                </div>
              )}
              <form className="fhz-contactForm01__form" onSubmit={handleSubmit}>
                <div className="fhz-contactForm01__rowGrid">
                  {showFirstName && (
                    <div className="fhz-contactForm01__field">
                      <label className="fhz-contactForm01__label" htmlFor="fhz-vorname">
                        {firstNameLabel} {firstNameRequired && "*"}
                      </label>
                      <input
                        className="fhz-contactForm01__input"
                        id="fhz-vorname"
                        name="vorname"
                        type="text"
                        placeholder="Dein Vorname"
                        required={firstNameRequired}
                      />
                    </div>
                  )}

                  {showLastName && (
                    <div className="fhz-contactForm01__field">
                      <label className="fhz-contactForm01__label" htmlFor="fhz-nachname">
                        {lastNameLabel} {lastNameRequired && "*"}
                      </label>
                      <input
                        className="fhz-contactForm01__input"
                        id="fhz-nachname"
                        name="nachname"
                        type="text"
                        placeholder="Dein Nachname"
                        required={lastNameRequired}
                      />
                    </div>
                  )}
                </div>

                <div className="fhz-contactForm01__field">
                  <label className="fhz-contactForm01__label" htmlFor="fhz-email">
                    {emailLabel} {emailRequired && "*"}
                  </label>
                  <input
                    className="fhz-contactForm01__input"
                    id="fhz-email"
                    name="email"
                    type="email"
                    placeholder="beispiel@mail.de"
                    required={emailRequired}
                  />
                </div>

                <div className="fhz-contactForm01__field">
                  <label className="fhz-contactForm01__label" htmlFor="fhz-msg">
                    {messageLabel} {messageRequired && "*"}
                  </label>
                  <textarea
                    className="fhz-contactForm01__textarea"
                    id="fhz-msg"
                    name="message"
                    placeholder="Wie kann ich dir helfen?"
                    required={messageRequired}
                  />
                </div>

                {/* Honeypot */}
                <input type="text" name="website" style={{ display: "none" }} tabIndex={-1} autoComplete="off" />

                {/* reCAPTCHA */}
                {enableRecaptcha && siteKey && (
                  <div className="fhz-contactForm01__captcha" aria-label="Captcha">
                    <div id="recaptcha-container"></div>
                  </div>
                )}

                <button className="fhz-contactForm01__submit" type="submit" disabled={isLoading}>
                  {isLoading ? "Wird gesendet..." : submitButtonText}
                  <span className="fhz-contactForm01__submitIcon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M22 2 11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      <path d="M22 2 15 22l-4-9-9-4 20-7z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                    </svg>
                  </span>
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}



