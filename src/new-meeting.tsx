import { Form, ActionPanel, Action, showToast, Clipboard } from "@raycast/api";
import { appendFileSync } from "fs";
import { useState, useEffect, useRef } from "react";
import configDataJson from "./config.json";
import {
  ConfigData,
  getEmojiForType,
  capitalizeType,
  formatFriendlyTime,
  formatMetadataComment,
  resolveBraindumpPath,
  parseGranolaTranscript,
} from "./utils";

type Values = {
  meetingType: string;
  title: string;
  content: string;
  attendees: string[];
  additionalAttendees: string;
  tldr: string;
};

export default function Command() {
  const [meetingType, setMeetingType] = useState("meeting");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [attendees, setAttendees] = useState<string[]>([]);
  const [additionalAttendees, setAdditionalAttendees] = useState("");
  const [tldr, setTldr] = useState("");
  const [configData, setConfigData] = useState<ConfigData>({
    defaultAttendee: "You",
    suggestedAttendees: [],
    companyPrefixes: [],
    peopleTags: [],
    braindumpCandidates: [],
    learningProjects: [],
  });

  // Track last processed clipboard to avoid re-processing after form reset
  const lastProcessedClipboard = useRef<string>("");

  // Load config data on component mount
  useEffect(() => {
    setConfigData(configDataJson);
    // Pre-select only the default attendee
    setAttendees([configDataJson.defaultAttendee]);
  }, []);

  // Resolve braindump path from config
  const braindumpPath = resolveBraindumpPath(
    configData.braindumpCandidates.length > 0
      ? configData.braindumpCandidates
      : ["/Users/harry.angeles/Documents/harryGit/Hnotes/00Inbox/braindump.md"],
  );

  // Pre-populate title and content from clipboard (supports Granola transcript format)
  useEffect(() => {
    const populateFromClipboard = async () => {
      try {
        const clipboardText = await Clipboard.readText();
        if (!clipboardText) return;

        // Skip if we already processed this clipboard content
        if (clipboardText === lastProcessedClipboard.current) return;

        // Skip if form already has content (user is editing)
        if (content || title) return;

        const { title: parsedTitle, content: parsedContent } = parseGranolaTranscript(clipboardText);

        if (parsedTitle) {
          setTitle(parsedTitle);
        }
        setContent(parsedContent);

        // Mark this clipboard content as processed
        lastProcessedClipboard.current = clipboardText;
      } catch (error) {
        console.error("Error reading clipboard:", error);
      }
    };

    populateFromClipboard();
  }, [content, title]);

  function handleSubmit(values: Values) {
    // Validation
    if (!values.title?.trim()) {
      showToast({ title: "Error", message: "Title is required" });
      return;
    }

    try {
      const now = new Date();
      const dateStr = now.toISOString().split("T")[0];
      const datetimeStr = now.toISOString().replace("T", " ").split(".")[0];

      const friendlyTime = formatFriendlyTime(now);
      const emoji = getEmojiForType(values.meetingType);
      const typeLabel = capitalizeType(values.meetingType);

      // Combine selected attendees with additional attendees
      const additionalAttendeesList = values.additionalAttendees
        ? values.additionalAttendees
            .split(",")
            .map((name) => name.trim())
            .filter((name) => name.length > 0)
        : [];
      const allAttendees = [...values.attendees, ...additionalAttendeesList];
      const attendeesStr = allAttendees.join(", ");

      const meetingFields = [`title: ${values.title}`, `attendees: ${attendeesStr}`, `type: ${values.meetingType}`];

      const entry = `${formatMetadataComment(values.meetingType, dateStr, datetimeStr, meetingFields)}

## ${emoji} ${typeLabel} | ${values.title} | ${friendlyTime}

${values.tldr ? `${values.tldr}\n\n` : ""}${values.content || ""}

---
`;

      // Append to braindump.md file
      appendFileSync(braindumpPath, entry);

      showToast({
        title: "Meeting Added",
        message: `"${values.title}" added to braindump.md`,
      });

      // Reset all form fields
      setMeetingType("meeting");
      setTitle("");
      setContent("");
      setAttendees([configData.defaultAttendee]);
      setAdditionalAttendees("");
      setTldr("");
    } catch (error) {
      console.error("Error writing to braindump.md:", error);
      showToast({
        title: "Error",
        message: "Failed to add meeting to braindump.md",
      });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} title="Add to Braindump" />
          <Action.Open title="Open in Cursor" target={braindumpPath} application="Cursor" />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="title"
        title="Title"
        placeholder="Meeting topic or interview subject"
        value={title}
        onChange={setTitle}
      />

      <Form.Dropdown id="meetingType" title="Meeting Type" value={meetingType} onChange={setMeetingType}>
        <Form.Dropdown.Item value="meeting" title="🤝 Meeting" />
        <Form.Dropdown.Item value="interview" title="🎙️ User Interview" />
      </Form.Dropdown>

      <Form.TagPicker
        id="attendees"
        title="Attendees"
        value={attendees}
        onChange={setAttendees}
        placeholder="Add attendees"
      >
        {configData.suggestedAttendees.map((attendee) => (
          <Form.TagPicker.Item key={attendee} value={attendee} title={attendee} />
        ))}
      </Form.TagPicker>

      <Form.TextField
        id="additionalAttendees"
        title="Additional attendees"
        placeholder="e.g., John, Jane, Bob"
        value={additionalAttendees}
        onChange={setAdditionalAttendees}
      />

      <Form.TextArea
        id="tldr"
        title="TLDR"
        placeholder="Quick personal notes or takeaways (optional)"
        value={tldr}
        onChange={setTldr}
      />

      <Form.TextArea
        id="content"
        title="Content"
        placeholder="Add or paste meeting notes (optional)"
        value={content}
        onChange={setContent}
      />
    </Form>
  );
}
