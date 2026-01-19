import { existsSync, mkdirSync, writeFileSync } from "fs";
import { dirname } from "path";

// ============================================================================
// Types
// ============================================================================

export type ConfigData = {
  defaultAttendee: string;
  suggestedAttendees: string[];
  companyPrefixes: Array<{ value: string; title: string }>;
  peopleTags: string[];
  braindumpCandidates: string[];
};

// ============================================================================
// Formatting Utilities
// ============================================================================

const EMOJI_MAP: { [key: string]: string } = {
  idea: "💡",
  note: "📝",
  meeting: "🤝",
  interview: "🎙️",
  task: "✅",
  reference: "🔗",
  people: "👤",
};

export function getEmojiForType(type: string): string {
  return EMOJI_MAP[type] || "📝";
}

export function capitalizeType(type: string): string {
  if (type === "interview") return "User Interview";
  return type.charAt(0).toUpperCase() + type.slice(1);
}

export function formatFriendlyTime(date: Date): string {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? "pm" : "am";
  const displayHours = hours % 12 || 12;
  const timeStr =
    minutes === 0 ? `${displayHours}${ampm}` : `${displayHours}:${minutes.toString().padStart(2, "0")}${ampm}`;

  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const month = monthNames[date.getMonth()];
  const day = date.getDate();

  return `${timeStr}, ${month} ${day}`;
}

export function formatMetadataComment(type: string, date: string, time: string, additionalFields: string[]): string {
  const base = `<!-- ENTRY: ${type} | ${date} | ${time}`;
  const fields = additionalFields.join(" | ");
  return fields ? `${base} | ${fields} -->` : `${base} -->`;
}

// ============================================================================
// File Operations
// ============================================================================

export function getFirstExistingPath(paths: string[]): string | null {
  for (const p of paths) {
    if (existsSync(p) || existsSync(dirname(p))) return p;
  }
  return null;
}

export function ensureFileExists(filePath: string): void {
  const dir = dirname(filePath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  if (!existsSync(filePath)) writeFileSync(filePath, "");
}

export function resolveBraindumpPath(candidates: string[]): string {
  const found = getFirstExistingPath(candidates);
  const chosen = found ?? candidates[0];
  ensureFileExists(chosen);
  return chosen;
}

// ============================================================================
// Parsing Utilities
// ============================================================================

/**
 * Parse Granola transcript format.
 * Extracts title from "# Title" heading and removes the date line.
 */
export function parseGranolaTranscript(text: string): { title: string; content: string } {
  const lines = text.trim().split("\n");

  // Check if first line is a markdown heading
  const headingMatch = lines[0]?.match(/^#\s+(.+)$/);
  if (!headingMatch) {
    return { title: "", content: text.trim() };
  }

  const title = headingMatch[1].trim();

  // Skip the heading line and find where content starts
  // Granola format: # Title, blank line, date line, blank line, content
  let contentStartIndex = 1;

  // Skip blank lines and date line after title
  while (contentStartIndex < lines.length) {
    const line = lines[contentStartIndex].trim();
    // Skip empty lines
    if (line === "") {
      contentStartIndex++;
      continue;
    }
    // Skip date line (format: "Thu, 15 Jan 26" or similar short date patterns)
    if (/^[A-Z][a-z]{2},?\s+\d{1,2}\s+[A-Z][a-z]{2}\s+\d{2,4}$/.test(line)) {
      contentStartIndex++;
      continue;
    }
    // Found actual content
    break;
  }

  const content = lines.slice(contentStartIndex).join("\n").trim();
  return { title, content };
}

/**
 * Check if text looks like a valid URL.
 */
export function isValidUrl(text: string): boolean {
  try {
    new URL(text);
    return true;
  } catch {
    // Also check for common URL patterns that might not pass URL constructor
    const urlPattern = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/i;
    return urlPattern.test(text);
  }
}
