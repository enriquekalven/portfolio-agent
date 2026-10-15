/**
 * Regression tests for chat markdown rendering (src/markdown.ts).
 * Run: npx tsx tests/markdown.test.ts
 *
 * Model output is untrusted, so these cover the injection cases that the previous renderer let
 * through (unescaped quotes in attributes, javascript:/data: URLs) plus normal formatting.
 */
import { strict as assert } from "assert";
import { renderMarkdown, sanitizeUrl } from "../src/markdown";

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`✗ ${name}\n  ${(err as Error).message}`);
    failed++;
  }
}

console.log("Markdown rendering - security");

test("image alt cannot break out into an onerror attribute", () => {
  const html = renderMarkdown('![x" onerror="alert(1)](https://example.com/x.png)');
  const tag = html.match(/<img[^>]*>/)?.[0] ?? "";
  // Blank out quoted attribute values; an injected handler would survive outside them.
  const outsideValues = tag.replace(/"[^"]*"/g, '""');
  assert.ok(tag, html);
  assert.ok(!/onerror/i.test(outsideValues), tag);
});

test("javascript: links are not rendered as links", () => {
  const html = renderMarkdown("[click me](javascript:alert(document.cookie))");
  assert.ok(!/href="javascript:/i.test(html), html);
  assert.ok(html.includes("click me"), html);
});

test("data: images are dropped", () => {
  const html = renderMarkdown("![x](data:image/svg+xml;base64,PHN2Zz4=)");
  assert.ok(!html.includes("<img"), html);
});

test("raw HTML is escaped", () => {
  const html = renderMarkdown("<script>alert(1)</script><img src=x onerror=alert(1)>");
  assert.ok(!html.includes("<script"), html);
  assert.ok(!html.includes("<img"), html);
  assert.ok(html.includes("&lt;script&gt;"), html);
});

test("a quote inside a link URL cannot add attributes", () => {
  const html = renderMarkdown('[x](https://example.com"onmouseover="alert(1))');
  assert.ok(!/onmouseover="/i.test(html), html);
});

test("sanitizeUrl allows only http(s), same-site paths, and anchors", () => {
  assert.equal(sanitizeUrl("https://enriquekchan.web.app"), "https://enriquekchan.web.app");
  assert.equal(sanitizeUrl("/assets/hero.png"), "/assets/hero.png");
  assert.equal(sanitizeUrl("#top"), "#top");
  assert.equal(sanitizeUrl("javascript:alert(1)"), null);
  assert.equal(sanitizeUrl(" JaVaScRiPt:alert(1)"), null);
  assert.equal(sanitizeUrl("//evil.example/x"), null);
  assert.equal(sanitizeUrl("data:text/html,hi"), null);
});

console.log("\nMarkdown rendering - formatting");

test("markdown links render with safe rel/target", () => {
  const html = renderMarkdown("[Portfolio](https://enriquekchan.web.app)");
  assert.ok(
    html.includes('<a href="https://enriquekchan.web.app" target="_blank" rel="noopener noreferrer">Portfolio</a>'),
    html
  );
});

test("a URL used as link text does not produce nested anchors", () => {
  const html = renderMarkdown("[https://enriquekchan.web.app](https://enriquekchan.web.app)");
  assert.equal((html.match(/<a /g) || []).length, 1, html);
});

test("raw URLs autolink without trailing punctuation", () => {
  const html = renderMarkdown("Visit https://enriquekchan.web.app.");
  assert.ok(html.includes('href="https://enriquekchan.web.app"'), html);
  assert.ok(html.includes("</a>."), html);
});

test("underscores inside URLs are not italicized", () => {
  const html = renderMarkdown("See https://example.com/a_b_c for details");
  assert.ok(html.includes('href="https://example.com/a_b_c"'), html);
  assert.ok(!html.includes("<em>"), html);
});

test("raw YouTube links become embeds", () => {
  const html = renderMarkdown("Watch https://www.youtube.com/watch?v=abcdefghijk");
  assert.ok(html.includes('src="https://www.youtube.com/embed/abcdefghijk"'), html);
});

test("bold, italic, and inline code render", () => {
  const html = renderMarkdown("**Bold** and *italic* and `code`");
  assert.ok(html.includes("<strong>Bold</strong>"), html);
  assert.ok(html.includes("<em>italic</em>"), html);
  assert.ok(html.includes("<code>code</code>"), html);
});

test("asterisk bullets become list items, not italics", () => {
  const html = renderMarkdown("* one\n* two");
  assert.ok(html.includes("<li>one</li>"), html);
  assert.ok(html.includes("<li>two</li>"), html);
  assert.ok(!html.includes("<em>"), html);
});

console.log(`\nMarkdown tests: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
