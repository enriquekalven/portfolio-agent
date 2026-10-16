/*
 * Safety gate for visitor messages (used by api-server.ts, tested by tests/safety.test.ts).
 *
 * This is a pure function with no shared state: the server passes in only the current visitor's
 * own recent turns. It used to keep one module-level sliding window shared by every visitor, so
 * one person's blocked phrase could block the next visitors' innocent questions.
 */

// Only requests for someone's personal financial/identity data or for financial/medical advice are
// refused. Topic words alone ("credit card fraud detection", "financial planning tools",
// "prescription workflows") are normal career questions about projects and stay allowed.
const SENSITIVE_CATEGORIES: Record<string, string[]> = {
  finance: [
    'bank account number', 'account number', 'routing number', 'credit card number', 'card number',
    'cvv', 'social security number', 'ssn', 'his bank account', 'your bank account', 'bank details',
    'investment advice', 'financial advice', 'stock tip', 'stock tips', 'should i invest', 'should i buy'
  ],
  medical: [
    'medical advice', 'medical diagnosis', 'diagnose me', 'diagnose my', 'prescribe me',
    'what medication should'
  ],
};

const TONE_MISMATCH_PATTERNS = [
  'as a banker', 'speak like a banker', 'acting as a financial advisor',
  'ignore your resume', 'you are now a'
];

// Phrases are matched on word boundaries so "ssn" no longer matches inside other words, and
// topic words a recruiter might use ("system prompt design", "SQL injection detection in
// Cockpit") are no longer blocked; only the reveal/override forms are.
const FORBIDDEN_PATTERNS = [
  '<script', 'javascript:', 'eval(', 'onload', 'onerror',
  'ignore all previous', 'ignore previous instructions', 'reveal your instructions',
  'reveal your system prompt', 'show me your system prompt', 'print your system prompt',
  'ignore your system prompt', 'what is your system prompt',
  'drop table', 'delete from', 'truncate table',
  '</system>', '[prompt]', '[instruction]', 'assistant:'
];

/** Only the first MAX_CHECKED_CHARS of a message are checked and passed on to the model. */
export const MAX_CHECKED_CHARS = 1000;

function containsPattern(text: string, pattern: string): boolean {
  const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const start = /^\w/.test(pattern) ? "\\b" : "";
  const end = /\w$/.test(pattern) ? "\\b" : "";
  return new RegExp(`${start}${escaped}${end}`, "i").test(text);
}

export type SafetyResult = { ok: true; text: string } | { ok: false; category: string };

/**
 * Checks a visitor message, together with that visitor's last two turns so a payload split
 * across messages is still caught. Returns the (length-capped) text to use when it passes.
 */
export function checkSafety(input: string, priorUserTexts: string[] = []): SafetyResult {
  const text = (input || "").slice(0, MAX_CHECKED_CHARS);
  if (!text) return { ok: true, text };

  // Payload-splitting protection: scan this visitor's last two turns together with the new one.
  const window = [...priorUserTexts.slice(-2), text].join(" ");

  for (const pattern of TONE_MISMATCH_PATTERNS) {
    if (containsPattern(window, pattern)) return { ok: false, category: "persona" };
  }
  for (const [category, patterns] of Object.entries(SENSITIVE_CATEGORIES)) {
    for (const pattern of patterns) {
      if (containsPattern(window, pattern)) return { ok: false, category };
    }
  }
  for (const pattern of FORBIDDEN_PATTERNS) {
    if (containsPattern(window, pattern)) return { ok: false, category: "injection" };
  }
  return { ok: true, text };
}
