/**
 * Tests for the Gem cards visitors actually see (src/a2a-client.ts), driven through the same path
 * production uses in static mode: the server answers {a2ui: [], mode: "static"} and the client
 * renders the synced portfolio dataset.
 * Run: npx tsx tests/gem-content.test.ts
 *
 * Replaces tests/unit-tests.mjs and tests/integration-tests.mjs, which exercised pasted copies of
 * this code and so stayed green whatever shipped.
 */
import { strict as assert } from "assert";
import { existsSync } from "fs";
import { join } from "path";
import { SUPPORTED_GEM_FORMATS } from "../src/gem-formats";

// --- Browser globals the client touches ---------------------------------------------------------
const storage = new Map<string, string>();
(globalThis as any).sessionStorage = {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => storage.set(key, String(value)),
};

const sentFormats: string[] = [];
(globalThis as any).fetch = async (_url: string, init?: { body?: string }) => {
  const body = JSON.parse(init?.body || "{}");
  const format = String(body.message || "").split(":")[0];
  sentFormats.push(format);
  // What the server returns in GEM_CONTENT_SOURCE=static mode.
  return new Response(JSON.stringify({ format, surfaceId: "portfolioContent", a2ui: [], mode: "static" }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};

const { A2AClient } = await import("../src/a2a-client");
const portfolio: any = (await import("../src/portfolio-data.json")).default;
const client = new A2AClient();

/** Calls the client with its console logging silenced. */
async function generate(format: string, context = "") {
  const log = console.log;
  console.log = () => {};
  try {
    return await client.generateContent(format, context);
  } finally {
    console.log = log;
  }
}

// --- A2UI structure checks ------------------------------------------------------------------------
function validateA2UI(messages: any[], label: string): any[] {
  assert.ok(Array.isArray(messages) && messages.length > 0, `${label}: no A2UI messages`);
  const begin = messages.find((m) => m?.beginRendering)?.beginRendering;
  const update = messages.find((m) => m?.surfaceUpdate)?.surfaceUpdate;
  assert.ok(begin, `${label}: missing beginRendering`);
  assert.ok(update, `${label}: missing surfaceUpdate`);
  assert.equal(begin.surfaceId, update.surfaceId, `${label}: beginRendering and surfaceUpdate target different surfaces`);

  const components: any[] = update.components;
  const ids = components.map((c) => c.id);
  assert.ok(ids.every(Boolean), `${label}: component without an id`);
  assert.equal(new Set(ids).size, ids.length, `${label}: duplicate component ids`);
  const known = new Set(ids);
  assert.ok(known.has(begin.root), `${label}: root "${begin.root}" is not a component`);

  for (const c of components) {
    const types = Object.keys(c.component || {});
    assert.equal(types.length, 1, `${label}: ${c.id} must have exactly one component type`);
    const props = c.component[types[0]] || {};
    const children = [...(props.children?.explicitList ?? []), ...(props.child ? [props.child] : [])];
    for (const child of children) assert.ok(known.has(child), `${label}: ${c.id} references missing child "${child}"`);
  }
  return components;
}

/** Every local /assets/... path the cards reference must exist, or visitors see broken images. */
function assertLocalAssetsExist(payload: unknown, label: string) {
  const paths = [...JSON.stringify(payload).matchAll(/"(\/assets\/[^"?#]+)"/g)].map((m) => m[1]);
  const missing = [...new Set(paths)].filter((p) => !existsSync(join(process.cwd(), "public", p)));
  assert.deepEqual(missing, [], `${label}: missing assets ${missing.join(", ")}`);
}

function assertNoStaleClaims(payload: unknown, label: string) {
  const text = JSON.stringify(payload);
  for (const stale of ["Azure", "19x", "podcast.m4a", "Why-Agents-Fail", "ATP and bond energy"]) {
    assert.ok(!text.includes(stale), `${label}: contains stale content "${stale}"`);
  }
}

let passed = 0;
let failed = 0;
async function test(name: string, fn: () => Promise<void> | void) {
  try {
    await fn();
    console.log(`✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`✗ ${name}\n  ${(err as Error).message}`);
    failed++;
  }
}

// Formats the orchestrator can request, with the context a Gem click sends.
const GEM_REQUESTS: Array<[format: string, context: string]> = [
  ["flashcards", "Skill Matcher"],
  ["flashcards", "Fit Analyzer"],
  ["timeline", "Career Historian"],
  ["video_cards", "Cinema Hub, YouTube"],
  ["blog", "Insight Stream, Medium"],
  ["awards", "Trophy Room, SWIFTY"],
  ["certs", "Google Cloud, AWS"],
  ["speaker", "Google Cloud Next"],
  ["testimonials", "Thomas Kurian"],
  ["gallery", "Hall of Mastery"],
  ["repositories", "GitHub"],
  ["matrix", "Strategic Integration Matrix"],
  ["radar", "Skill Radar"],
  ["quiz", "Google Cloud career"],
  ["general", "Who is Enrique?"],
];
const UTILITY_FORMATS = ["bubble", "weather", "stock", "time"];

console.log("Gem cards (static mode, real client code)");

for (const [format, context] of GEM_REQUESTS) {
  await test(`${format} (${context}) renders valid A2UI from the synced dataset`, async () => {
    const result = await generate(format, context);
    assert.ok(!result.error, `${format}: ${result.error}`);
    validateA2UI(result.a2ui, format);
    assertLocalAssetsExist(result.a2ui, format);
    assertNoStaleClaims(result.a2ui, format);
  });
}

for (const format of UTILITY_FORMATS) {
  await test(`${format} utility renders locally without a server call`, async () => {
    const before = sentFormats.length;
    const result = await generate(format, format);
    validateA2UI(result.a2ui, format);
    assertLocalAssetsExist(result.a2ui, format);
    assert.equal(sentFormats.length, before, `${format} should not call the server`);
  });
}

await test("podcast and audio requests show the recorded talks", async () => {
  for (const format of ["podcast", "audio"]) {
    const result = await generate(format, "deep dive");
    assert.equal(result.format, "video_cards", `${format} rendered ${result.format}`);
    validateA2UI(result.a2ui, format);
  }
});

console.log("\nClient/server contract and data sync");

await test("every format the client sends is accepted by the server", () => {
  const unsupported = [...new Set(sentFormats)].filter((f) => !SUPPORTED_GEM_FORMATS.has(f));
  assert.ok(sentFormats.length > 0, "no requests were sent");
  assert.deepEqual(unsupported, [], `server would reject: ${unsupported.join(", ")}`);
});

await test("timeline lists every role in the dataset, newest first", async () => {
  const text = JSON.stringify((await generate("timeline", "Career Historian")).a2ui);
  for (const exp of portfolio.EXPERIENCE) assert.ok(text.includes(exp.role), `missing role "${exp.role}"`);
  assert.ok(text.indexOf(portfolio.EXPERIENCE[0].role) < text.indexOf(portfolio.EXPERIENCE.at(-1).role), "roles out of order");
});

await test("Trophy Room leads with the newest award", async () => {
  const text = JSON.stringify((await generate("awards", "Trophy Room")).a2ui);
  assert.ok(text.includes(portfolio.AWARDS[0].title), `missing "${portfolio.AWARDS[0].title}"`);
});

await test("certification facts match the dataset (16 = 8 GCP + 6 AWS + 2)", async () => {
  const total = portfolio.CERTIFICATION_GROUPS.reduce((n: number, g: any) => n + g.certs.length, 0);
  assert.equal(total, 16, `dataset has ${total} certifications`);
  const quiz = JSON.stringify((await generate("quiz", "certifications")).a2ui);
  if (/certif/i.test(quiz)) assert.ok(quiz.includes("16"), "certification quiz doesn't say 16");
});

console.log(`\nGem content tests: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
