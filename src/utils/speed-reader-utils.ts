// ============================================================================
// ORP (Optimal Recognition Point) Utilities
// ============================================================================

/**
 * Calculate the optimal recognition point index for a word.
 * Position ~25% into the word based on length.
 */
export function getORPIndex(word: string): number {
  const len = word.length;
  if (len <= 1) return 0;
  if (len <= 5) return 1;
  if (len <= 9) return 2;
  if (len <= 13) return 3;
  return 4;
}

/**
 * Split a word into three parts: before ORP, ORP letter, after ORP.
 */
export function splitWordAtORP(word: string): { before: string; orp: string; after: string } {
  const orpIndex = getORPIndex(word);
  return {
    before: word.slice(0, orpIndex),
    orp: word[orpIndex] || "",
    after: word.slice(orpIndex + 1),
  };
}

// ============================================================================
// SVG Generation
// ============================================================================

/**
 * Generate an SVG image displaying the word with ORP highlighting.
 * Uses dark background with white text and red ORP letter.
 */
export function generateWordSVG(word: string): string {
  const { before, orp, after } = splitWordAtORP(word);

  // SVG dimensions
  const width = 600;
  const height = 120;
  const centerX = width / 2;
  const centerY = height / 2;

  // Font settings
  const fontSize = 48;
  const charWidth = fontSize * 0.6; // Approximate monospace character width

  // Calculate positioning so ORP letter is at center
  const orpIndex = getORPIndex(word);

  // Position so ORP letter is at center
  const startX = centerX - orpIndex * charWidth - charWidth / 2;

  // Colors
  const bgColor = "#1a1a1a";
  const textColor = "#ffffff";
  const orpColor = "#ff4444";
  const guideColor = "#444444";
  const pivotColor = "#666666";

  // Guide line positions
  const guideLineY1 = centerY - 30;
  const guideLineY2 = centerY + 35;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="${width}" height="${height}" fill="${bgColor}"/>

  <!-- Horizontal guide lines -->
  <line x1="50" y1="${guideLineY1}" x2="${width - 50}" y2="${guideLineY1}" stroke="${guideColor}" stroke-width="1"/>
  <line x1="50" y1="${guideLineY2}" x2="${width - 50}" y2="${guideLineY2}" stroke="${guideColor}" stroke-width="1"/>

  <!-- Vertical pivot marker -->
  <line x1="${centerX}" y1="${guideLineY1 - 10}" x2="${centerX}" y2="${guideLineY1}" stroke="${pivotColor}" stroke-width="2"/>
  <line x1="${centerX}" y1="${guideLineY2}" x2="${centerX}" y2="${guideLineY2 + 10}" stroke="${pivotColor}" stroke-width="2"/>

  <!-- Word text with ORP highlighting -->
  <text x="${startX}" y="${centerY + fontSize / 3}" font-family="Monaco, Menlo, Consolas, monospace" font-size="${fontSize}" fill="${textColor}">
    <tspan>${escapeXml(before)}</tspan><tspan fill="${orpColor}">${escapeXml(orp)}</tspan><tspan>${escapeXml(after)}</tspan>
  </text>
</svg>`;
}

/**
 * Escape special XML characters for safe SVG embedding.
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Convert an SVG string to a base64 data URI.
 */
export function svgToBase64DataUri(svg: string): string {
  const base64 = Buffer.from(svg).toString("base64");
  return `data:image/svg+xml;base64,${base64}`;
}

// ============================================================================
// Text Tokenization
// ============================================================================

/**
 * Smart tokenization that handles punctuation and special characters.
 * Keeps punctuation attached to words but splits on whitespace.
 */
export function tokenizeText(text: string): string[] {
  if (!text || typeof text !== "string") {
    return [];
  }

  // Normalize whitespace and split into words
  const words = text
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .filter((word) => word.length > 0);

  return words;
}

// ============================================================================
// Time Formatting
// ============================================================================

/**
 * Format seconds into a human-readable time string (e.g., "2:30").
 */
export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return "0:00";
  }

  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Calculate remaining reading time based on words left and WPM.
 */
export function calculateRemainingTime(wordsLeft: number, wpm: number): number {
  if (wpm <= 0) return 0;
  return (wordsLeft / wpm) * 60;
}
