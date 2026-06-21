// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { Sanitizer } from "./Sanitizer";

const s = new Sanitizer();

describe("Sanitizer – Präsentations-Styles (WYSIWYG 1:1 zur Seite)", () => {
  it("behält Hero-/Karten-Styles (border-radius, box-shadow, padding, gradient)", () => {
    // Hinweis: Der CSS-`background`-Shorthand mit linear-gradient lässt jsdom beim
    // innerHTML-Parsen abstürzen (Browser-Bug in jsdom, nicht im Sanitizer);
    // Verläufe daher über `background-image` testen (Produktion nutzt zusätzlich
    // den Shorthand, der durch die Prop-Allowlist ebenfalls erhalten bleibt).
    const html =
      '<div style="background-image: linear-gradient(to bottom right, #fffbeb, #fff1f2); border-radius: 1rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1); padding: 3rem;">Hero</div>';
    const out = s.sanitize(html);
    expect(out).toContain("background-image:");
    expect(out).toContain("border-radius: 1rem");
    expect(out).toContain("box-shadow:");
    expect(out).toContain("padding: 3rem");
  });

  it("behält Grid-Layout-Styles (display, grid-template-columns, gap)", () => {
    const html =
      '<div style="display: grid; grid-template-columns: repeat(1, minmax(0, 1fr)); gap: 1.5rem;">x</div>';
    const out = s.sanitize(html);
    expect(out).toContain("display: grid");
    expect(out).toContain("grid-template-columns:");
    expect(out).toContain("gap: 1.5rem");
  });

  it("behält background-image mit erlaubter url()", () => {
    const html =
      '<div style="background-image: url(/media/hero.jpg); background-size: cover;">x</div>';
    const out = s.sanitize(html);
    expect(out).toContain("background-image: url(/media/hero.jpg)");
    expect(out).toContain("background-size: cover");
  });

  it("entfernt gefährliche url()-Schemata im Style", () => {
    const html =
      '<div style="background-image: url(javascript:alert(1)); color: red;">x</div>';
    const out = s.sanitize(html);
    expect(out).not.toContain("javascript:");
    // Unbedenkliche Deklaration bleibt erhalten.
    expect(out).toContain("color: red");
  });

  it("entfernt expression() weiterhin", () => {
    const html = '<div style="width: expression(alert(1)); padding: 1rem;">x</div>';
    const out = s.sanitize(html);
    expect(out).not.toContain("expression");
    expect(out).toContain("padding: 1rem");
  });

  it("behält <video> und <section> sowie deren Styles", () => {
    const html =
      '<section style="padding: 2rem 0;"><video src="/media/clip.mp4" controls style="width:100%;"></video></section>';
    const out = s.sanitize(html);
    expect(out).toContain("<section");
    expect(out).toContain("<video");
    expect(out).toContain('src="/media/clip.mp4"');
    expect(out).toContain("controls");
  });

  it("blockt weiterhin Event-Handler und script-Tags", () => {
    const html =
      '<div onclick="alert(1)" style="color: red;">x</div><script>alert(2)</script>';
    const out = s.sanitize(html);
    expect(out).not.toContain("onclick");
    expect(out).not.toContain("<script");
    expect(out).toContain("color: red");
  });

  it("behält FHZ-Embed-Attribute (Inhaltsblöcke)", () => {
    const html =
      '<div data-fhz-block="courses" data-fhz-block-id="abc" data-fhz-block-data="{}" contenteditable="false">x</div>';
    const out = s.sanitize(html);
    expect(out).toContain('data-fhz-block="courses"');
    expect(out).toContain('data-fhz-block-id="abc"');
  });
});

describe("Sanitizer – <style>-Blöcke im Inhalt (seiten-spezifisches CSS)", () => {
  it("erhält einen <style>-Block samt CSS-Regeln", () => {
    const html =
      '<style>:root{--brand:#c0363b}.fhz-hero{min-height:70vh;background-size:cover}.fhz-btn:hover{transform:translateY(-3px)}</style><div class="fhz-hero">x</div>';
    const out = s.sanitize(html);
    expect(out).toContain("<style>");
    expect(out).toContain("--brand:#c0363b");
    expect(out).toContain(".fhz-hero");
    expect(out).toContain(".fhz-btn:hover");
    expect(out).toContain("transform:translateY(-3px)");
  });

  it("erhält @media- und @keyframes-Regeln im <style>-Block", () => {
    const html =
      "<style>@media (max-width:768px){.fhz-hero{min-height:45vh}}@keyframes spin{to{transform:rotate(360deg)}}</style>";
    const out = s.sanitize(html);
    expect(out).toContain("@media");
    expect(out).toContain("@keyframes");
  });

  it("neutralisiert gefährliche Konstrukte im <style>-Block", () => {
    const html =
      '<style>.x{background:url(javascript:alert(1))}.y{width:expression(alert(1))}.z{behavior:url(#default#-moz-binding)}</style>';
    const out = s.sanitize(html);
    expect(out).toContain("<style>");
    expect(out.toLowerCase()).not.toContain("url(javascript:");
    expect(out.toLowerCase()).not.toContain("expression(");
    expect(out.toLowerCase()).not.toContain("-moz-binding");
  });

  it("entfernt weiterhin <script>, behält aber <style>", () => {
    const html = '<style>.a{color:red}</style><script>alert(1)</script><p>ok</p>';
    const out = s.sanitize(html);
    expect(out).toContain("<style>");
    expect(out).not.toContain("<script");
    expect(out).toContain("<p>ok</p>");
  });
});
