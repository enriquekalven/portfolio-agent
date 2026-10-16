/*
 * Gem content formats accepted by POST /a2ui-agent/a2a/query (api-server.ts).
 * Shared with tests/gem-content.test.ts, which checks that every format the client can send is on
 * this list; an unlisted format gets a 400 and the client silently falls back.
 */
export const SUPPORTED_GEM_FORMATS: ReadonlySet<string> = new Set([
  "flashcards", "quiz", "audio", "podcast", "video", "image", "timeline", "video_cards",
  "blog_cards", "awards", "certs", "speaker", "testimonials", "gallery", "creative", "comics",
  "matrix", "charts", "bubble", "weather", "stock", "time", "repositories", "analyst", "general",
]);
