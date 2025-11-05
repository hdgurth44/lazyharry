import { Form, ActionPanel, Action, showToast, Clipboard } from "@raycast/api";
import { existsSync, mkdirSync, appendFileSync, writeFileSync } from "fs";
import { dirname } from "path";
import { useState, useEffect } from "react";
import configDataJson from "./config.json";

type Values = {
  meetingType: string;
  title: string;
  content: string;
  attendees: string[];
  additionalAttendees: string;
  tldr: string;
};

// Helper function to get emoji for meeting type
function getEmojiForType(type: string): string {
  const emojiMap: { [key: string]: string } = {
    meeting: "🤝",
    interview: "🎙️"
  };
  return emojiMap[type] || "🤝";
}

// Helper function to capitalize type name
function capitalizeType(type: string): string {
  if (type === "interview") return "User Interview";
  return type.charAt(0).toUpperCase() + type.slice(1);
}

// Helper function to format time as "10am, Oct 25"
function formatFriendlyTime(date: Date): string {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'pm' : 'am';
  const displayHours = hours % 12 || 12;
  const timeStr = minutes === 0 ? `${displayHours}${ampm}` : `${displayHours}:${minutes.toString().padStart(2, '0')}${ampm}`;

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = monthNames[date.getMonth()];
  const day = date.getDate();

  return `${timeStr}, ${month} ${day}`;
}

// Helper function to build metadata comment string
function formatMetadataComment(date: string, time: string, additionalFields: string[]): string {
  const base = `<!-- ENTRY: meeting | ${date} | ${time}`;
  const fields = additionalFields.join(' | ');
  return fields ? `${base} | ${fields} -->` : `${base} -->`;
}

type ConfigData = {
  defaultAttendee: string;
  suggestedAttendees: string[];
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
    suggestedAttendees: []
  });

  // Load config data on component mount
  useEffect(() => {
    setConfigData(configDataJson);
    // Pre-select only the default attendee
    setAttendees([configDataJson.defaultAttendee]);
  }, []);

  // Resolve braindump path for this machine (supports multiple locations)
  const braindumpCandidates = [
    "/Users/harry-daniel.gurth-angeles/Documents/GitHub/Hnotes/00Inbox/braindump.md",
    "/Users/hdga/Harry-Git/HNotes/00Inbox/braindump.md"
  ];

  function getFirstExistingPath(paths: string[]): string | null {
    for (const p of paths) {
      if (existsSync(p) || existsSync(dirname(p))) return p;
    }
    return null;
  }

  function ensureFileExists(filePath: string) {
    const dir = dirname(filePath);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    if (!existsSync(filePath)) writeFileSync(filePath, "");
  }

  const braindumpPath = (() => {
    const found = getFirstExistingPath(braindumpCandidates);
    const chosen = found ?? braindumpCandidates[0];
    ensureFileExists(chosen);
    return chosen;
  })();

  // Pre-populate content with clipboard text
  useEffect(() => {
    const populateFromClipboard = async () => {
      try {
        const clipboardText = await Clipboard.readText();
        if (!clipboardText || content) return;

        const trimmedText = clipboardText.trim();
        setContent(trimmedText);
      } catch (error) {
        console.error("Error reading clipboard:", error);
      }
    };

    populateFromClipboard();
  }, [content]);

  function handleSubmit(values: Values) {
    try {
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0]; // yyyy-MM-dd format
      const datetimeStr = now.toISOString().replace('T', ' ').split('.')[0]; // yyyy-MM-dd HH:mm:ss format

      const friendlyTime = formatFriendlyTime(now);
      const emoji = getEmojiForType(values.meetingType);
      const typeLabel = capitalizeType(values.meetingType);

      // Combine selected attendees with additional attendees
      const additionalAttendeesList = values.additionalAttendees
        ? values.additionalAttendees.split(',').map(name => name.trim()).filter(name => name.length > 0)
        : [];
      const allAttendees = [...values.attendees, ...additionalAttendeesList];
      const attendeesStr = allAttendees.join(', ');

      const meetingFields = [
        `title: ${values.title}`,
        `attendees: ${attendeesStr}`,
        `type: ${values.meetingType}`
      ];

      const entry = `${formatMetadataComment(dateStr, datetimeStr, meetingFields)}

## ${emoji} ${typeLabel} | ${values.title} | ${friendlyTime}

${values.tldr ? `${values.tldr}\n\n` : ''}${values.content || ''}

---
`;

      // Append to braindump.md file
      appendFileSync(braindumpPath, entry);

      showToast({
        title: "Meeting Added",
        message: `"${values.title}" added to braindump.md`
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
        message: "Failed to add meeting to braindump.md"
      });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} title="Add to Braindump" />
          <Action.Open
            title="Open in Cursor"
            target={braindumpPath}
            application="Cursor"
          />
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

      <Form.Dropdown
        id="meetingType"
        title="Meeting Type"
        value={meetingType}
        onChange={setMeetingType}
      >
        <Form.Dropdown.Item value="meeting" title="🤝 Meeting" />
        <Form.Dropdown.Item value="interview" title="🎙️ User Interview" />
      </Form.Dropdown>

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
    </Form>
  );
}
