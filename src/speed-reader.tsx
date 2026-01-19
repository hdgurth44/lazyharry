import { Detail, ActionPanel, Action, Clipboard, showToast, Toast } from "@raycast/api";
import { useState, useEffect, useCallback, useRef } from "react";
import {
  tokenizeText,
  generateWordSVG,
  svgToBase64DataUri,
  formatTime,
  calculateRemainingTime,
} from "./utils/speed-reader-utils";

// ============================================================================
// Types
// ============================================================================

interface SpeedReaderState {
  words: string[];
  currentIndex: number;
  isPlaying: boolean;
  wpm: number;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_WPM = 350;
const MIN_WPM = 50;
const MAX_WPM = 1000;
const WPM_STEP = 50;
const SKIP_WORDS = 10;

// ============================================================================
// Custom Hook: useSpeedReader
// ============================================================================

function useSpeedReader() {
  const [state, setState] = useState<SpeedReaderState>({
    words: [],
    currentIndex: 0,
    isPlaying: false,
    wpm: DEFAULT_WPM,
  });

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load text from clipboard
  const loadFromClipboard = useCallback(async () => {
    try {
      const text = await Clipboard.readText();
      if (!text || text.trim().length === 0) {
        showToast({
          style: Toast.Style.Failure,
          title: "Clipboard Empty",
          message: "Copy some text to your clipboard first",
        });
        return;
      }

      const words = tokenizeText(text);
      if (words.length === 0) {
        showToast({
          style: Toast.Style.Failure,
          title: "No Words Found",
          message: "Clipboard doesn't contain readable text",
        });
        return;
      }

      setState((prev) => ({
        ...prev,
        words,
        currentIndex: 0,
        isPlaying: false,
      }));

      showToast({
        style: Toast.Style.Success,
        title: "Text Loaded",
        message: `${words.length} words ready to read`,
      });
    } catch {
      showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: "Failed to read clipboard",
      });
    }
  }, []);

  // Toggle play/pause
  const togglePlay = useCallback(() => {
    setState((prev) => {
      // If at the end, restart from beginning when pressing play
      if (prev.currentIndex >= prev.words.length - 1 && !prev.isPlaying) {
        return { ...prev, currentIndex: 0, isPlaying: true };
      }
      return { ...prev, isPlaying: !prev.isPlaying };
    });
  }, []);

  // Advance to next word
  const nextWord = useCallback(() => {
    setState((prev) => {
      if (prev.currentIndex >= prev.words.length - 1) {
        return { ...prev, isPlaying: false };
      }
      return { ...prev, currentIndex: prev.currentIndex + 1 };
    });
  }, []);

  // Rewind by SKIP_WORDS
  const rewind = useCallback(() => {
    setState((prev) => ({
      ...prev,
      currentIndex: Math.max(0, prev.currentIndex - SKIP_WORDS),
    }));
  }, []);

  // Forward by SKIP_WORDS
  const forward = useCallback(() => {
    setState((prev) => ({
      ...prev,
      currentIndex: Math.min(prev.words.length - 1, prev.currentIndex + SKIP_WORDS),
    }));
  }, []);

  // Speed up
  const speedUp = useCallback(() => {
    setState((prev) => ({
      ...prev,
      wpm: Math.min(MAX_WPM, prev.wpm + WPM_STEP),
    }));
  }, []);

  // Slow down
  const slowDown = useCallback(() => {
    setState((prev) => ({
      ...prev,
      wpm: Math.max(MIN_WPM, prev.wpm - WPM_STEP),
    }));
  }, []);

  // Timer effect for auto-advancing words
  useEffect(() => {
    if (state.isPlaying && state.words.length > 0) {
      const intervalMs = (60 / state.wpm) * 1000;
      intervalRef.current = setInterval(nextWord, intervalMs);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [state.isPlaying, state.wpm, nextWord, state.words.length]);

  // Load clipboard on mount
  useEffect(() => {
    loadFromClipboard();
  }, [loadFromClipboard]);

  return {
    ...state,
    togglePlay,
    rewind,
    forward,
    speedUp,
    slowDown,
    loadFromClipboard,
  };
}

// ============================================================================
// Main Command Component
// ============================================================================

export default function Command() {
  const { words, currentIndex, isPlaying, wpm, togglePlay, rewind, forward, speedUp, slowDown, loadFromClipboard } =
    useSpeedReader();

  // Generate markdown content
  const generateMarkdown = () => {
    if (words.length === 0) {
      return `
# Speed Reader

No text loaded. Copy text to your clipboard and press **⌘R** to reload.

## Instructions
1. Copy text to your clipboard
2. Press **⌘R** to load the text
3. Press **Space** to start/pause reading
4. Use **⌘↑**/**⌘↓** to adjust speed
5. Use **←**/**→** to skip backward/forward
`;
    }

    const currentWord = words[currentIndex] || "";
    const svg = generateWordSVG(currentWord);
    const dataUri = svgToBase64DataUri(svg);

    return `![word](${dataUri})`;
  };

  // Calculate progress and time
  const progress = words.length > 0 ? Math.round((currentIndex / (words.length - 1)) * 100) || 0 : 0;
  const wordsLeft = Math.max(0, words.length - currentIndex - 1);
  const remainingSeconds = calculateRemainingTime(wordsLeft, wpm);
  const remainingTime = formatTime(remainingSeconds);

  return (
    <Detail
      markdown={generateMarkdown()}
      metadata={
        words.length > 0 ? (
          <Detail.Metadata>
            <Detail.Metadata.Label title="Speed" text={`${wpm} WPM`} />
            <Detail.Metadata.Label title="Status" text={isPlaying ? "▶ Playing" : "⏸ Paused"} />
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label title="Progress" text={`${currentIndex + 1} / ${words.length} (${progress}%)`} />
            <Detail.Metadata.Label title="Time Left" text={remainingTime} />
          </Detail.Metadata>
        ) : null
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Playback">
            <Action
              title={isPlaying ? "Pause" : "Play"}
              shortcut={{ modifiers: [], key: "space" }}
              onAction={togglePlay}
            />
            <Action title="Rewind 10 Words" shortcut={{ modifiers: [], key: "arrowLeft" }} onAction={rewind} />
            <Action title="Forward 10 Words" shortcut={{ modifiers: [], key: "arrowRight" }} onAction={forward} />
          </ActionPanel.Section>
          <ActionPanel.Section title="Speed">
            <Action title="Speed up (+50 WPM)" shortcut={{ modifiers: ["cmd"], key: "arrowUp" }} onAction={speedUp} />
            <Action
              title="Slow Down (-50 WPM)"
              shortcut={{ modifiers: ["cmd"], key: "arrowDown" }}
              onAction={slowDown}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Other">
            <Action title="Reload Clipboard" shortcut={{ modifiers: ["cmd"], key: "r" }} onAction={loadFromClipboard} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
