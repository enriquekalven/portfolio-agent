/*
 * Markdown rendering for chat messages.
 *
 * Model output is untrusted (a visitor can steer it), so everything is escaped first, including
 * quotes, and only http(s) or same-site URLs become links or images. Generated links and embeds
 * are swapped for placeholders while the later passes run, so they can't be re-processed or nested.
 *
 * This module has no DOM dependencies so it can be unit-tested in Node (tests/markdown.test.ts).
 */

const YOUTUBE_VIDEO_REGEX = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/;

/** Escapes text for HTML element and attribute contexts (quotes included). */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Allows absolute http(s) URLs and same-site paths only; javascript:, data:, etc. are dropped. */
export function sanitizeUrl(url: string): string | null {
  const trimmed = url.trim();
  if (/^https?:\/\//i.test(trimmed) || /^\/(?!\/)/.test(trimmed) || trimmed.startsWith("#")) {
    return trimmed;
  }
  return null;
}

/** Bold (**text**, __text__) and italic (*text*, _text_), limited to a single line. */
function applyEmphasis(html: string): string {
  return html
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/__(.+?)__/g, "<strong>$1</strong>")
    .replace(/\*([^*\n]+)\*/g, "<em>$1</em>")
    .replace(/(?<![a-zA-Z0-9])_([^_\n]+)_(?![a-zA-Z0-9])/g, "<em>$1</em>");
}

function youtubeEmbed(id: string): string {
  return `<div class="video-container" style="margin: 16px 0;"><iframe width="100%" height="315" src="https://www.youtube.com/embed/${id}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen style="border-radius: 12px;"></iframe></div>`;
}

function anchor(url: string, label: string): string {
  return `<a href="${url}" target="_blank" rel="noopener noreferrer">${label}</a>`;
}

/** Converts a chat message's markdown into safe HTML. */
export function renderMarkdown(text: string): string {
  let html = escapeHtml(text.replace(/\u0000/g, ""));
  const fragments: string[] = [];
  const protect = (fragment: string) => `\u0000${fragments.push(fragment) - 1}\u0000`;

  // Inline code: `code` (its contents are not processed further)
  html = html.replace(/`([^`]+)`/g, (_, code: string) => protect(`<code>${code}</code>`));

  // Images: ![alt](url)
  html = html.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (_, alt: string, url: string) => {
    const safeUrl = sanitizeUrl(url);
    return safeUrl
      ? protect(`<img src="${safeUrl}" alt="${alt}" loading="lazy" style="max-width: 100%; border-radius: 12px; margin: 12px 0; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">`)
      : alt;
  });

  // YouTube: [video](youtube_url)
  html = html.replace(/\[video\]\(([^)\s]+)\)/g, (_, url: string) => {
    const id = url.match(YOUTUBE_VIDEO_REGEX)?.[1];
    if (id) return protect(youtubeEmbed(id));
    // If not a video ID but still a URL, treat as regular anchor
    const safeUrl = sanitizeUrl(url);
    return safeUrl ? protect(anchor(safeUrl, safeUrl)) : url;
  });

  // Links: [text](url)
  html = html.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label: string, url: string) => {
    const safeUrl = sanitizeUrl(url);
    const formattedLabel = applyEmphasis(label);
    return safeUrl ? protect(anchor(safeUrl, formattedLabel)) : formattedLabel;
  });

  // Raw URLs: YouTube links become embeds, others become links (trailing punctuation excluded)
  html = html.replace(/https?:\/\/(?:(?!&quot;|&#39;|&lt;|&gt;)[^\s<\u0000])+/g, (match: string) => {
    const trailing = match.match(/[.,;:!?)]+$/)?.[0] ?? "";
    const url = trailing ? match.slice(0, -trailing.length) : match;
    const isYouTube = /^https?:\/\/(?:www\.)?(?:youtube\.com|youtu\.be)\//i.test(url);
    const id = isYouTube ? url.match(YOUTUBE_VIDEO_REGEX)?.[1] : undefined;
    if (id) return protect(youtubeEmbed(id)) + trailing;
    const safeUrl = sanitizeUrl(url);
    return (safeUrl ? protect(anchor(safeUrl, safeUrl)) : url) + trailing;
  });

  // Bold and italic
  html = applyEmphasis(html);

  // Convert bullet lists: lines starting with - or *
  html = html.replace(/^[\-\*]\s+(.+)$/gm, "<li>$1</li>");
  // Wrap consecutive <li> in <ul>
  html = html.replace(/(<li>.*<\/li>\n?)+/g, "<ul>$&</ul>");

  // Convert numbered lists: lines starting with 1. 2. etc
  html = html.replace(/^\d+\.\s+(.+)$/gm, "<li>$1</li>");

  // Convert double newlines to paragraph breaks
  html = html.replace(/\n\n+/g, "</p><p>");

  // Convert single newlines to <br> (but not inside lists)
  html = html.replace(/(?<!<\/li>)\n(?!<)/g, "<br>");

  // Wrap in paragraph if not empty
  if (html.trim()) {
    html = `<p>${html}</p>`;
  }

  // Clean up empty paragraphs and fix list wrapping
  html = html.replace(/<p>\s*<ul>/g, "<ul>");
  html = html.replace(/<\/ul>\s*<\/p>/g, "</ul>");
  html = html.replace(/<p>\s*<\/p>/g, "");

  // Restore the protected links, embeds, and code spans
  return html.replace(/\u0000(\d+)\u0000/g, (_, index: string) => fragments[Number(index)] ?? "");
}
