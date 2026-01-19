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
  isValidUrl,
} from "./utils";

type Values = {
  snippetType: string;
  title: string;
  content: string;
  url: string;
  companyPrefix: string;
  linkedinUrl: string;
  tags: string[];
};

export default function Command() {
  const [snippetType, setSnippetType] = useState("idea");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [url, setUrl] = useState("");
  const [configData, setConfigData] = useState<ConfigData>({
    defaultAttendee: "You",
    suggestedAttendees: [],
    companyPrefixes: [],
    peopleTags: [],
    braindumpCandidates: [],
  });

  // State variables for people type
  const [companyPrefix, setCompanyPrefix] = useState("KU");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [tags, setTags] = useState<string[]>([]);

  // Track last processed clipboard to avoid re-processing after form reset
  const lastProcessedClipboard = useRef<string>("");

  // Load config data on component mount
  useEffect(() => {
    setConfigData(configDataJson);
  }, []);

  // Resolve braindump path from config
  const braindumpPath = resolveBraindumpPath(
    configData.braindumpCandidates.length > 0
      ? configData.braindumpCandidates
      : ["/Users/harry.angeles/Documents/harryGit/Hnotes/00Inbox/braindump.md"],
  );

  // Pre-populate fields with clipboard content
  useEffect(() => {
    const populateFromClipboard = async () => {
      try {
        const clipboardText = await Clipboard.readText();
        if (!clipboardText) return;

        // Skip if we already processed this clipboard content
        if (clipboardText === lastProcessedClipboard.current) return;

        const trimmedText = clipboardText.trim();

        // Skip if form already has content
        if (snippetType === "note" && (url || content)) return;
        if (snippetType === "people" && linkedinUrl) return;

        if (snippetType === "note" && isValidUrl(trimmedText)) {
          setUrl(trimmedText);
          lastProcessedClipboard.current = clipboardText;
        } else if (snippetType === "people" && isValidUrl(trimmedText)) {
          setLinkedinUrl(trimmedText);
          lastProcessedClipboard.current = clipboardText;
        } else if (snippetType === "note" && !content) {
          setContent(trimmedText);
          lastProcessedClipboard.current = clipboardText;
        }
      } catch (error) {
        console.error("Error reading clipboard:", error);
      }
    };

    populateFromClipboard();
  }, [snippetType, url, content, linkedinUrl]);

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

      let entry = "";
      const friendlyTime = formatFriendlyTime(now);
      const emoji = getEmojiForType(values.snippetType);
      const typeLabel = capitalizeType(values.snippetType);

      // Format entry based on snippet type
      switch (values.snippetType) {
        case "idea":
          entry = `${formatMetadataComment("idea", dateStr, datetimeStr, [])}

## ${emoji} ${typeLabel} | ${friendlyTime}

${values.title}

---
`;
          break;

        case "note": {
          const noteFields = [`title: ${values.title}`];
          if (values.url) noteFields.push(`url: ${values.url}`);

          entry = `${formatMetadataComment("note", dateStr, datetimeStr, noteFields)}

## ${emoji} ${typeLabel} | ${values.title} | ${friendlyTime}

${values.content || ""}

---
`;
          break;
        }

        case "people": {
          const tagsList = values.tags.length > 0 ? values.tags.join(", ") : "";
          const fullName = `${values.companyPrefix} — ${values.title}`;
          const peopleFields = [`title: ${fullName}`, `company: ${values.companyPrefix}`];
          if (values.linkedinUrl) peopleFields.push(`linkedin: ${values.linkedinUrl}`);
          if (tagsList) peopleFields.push(`tags: ${tagsList}`);

          entry = `${formatMetadataComment("people", dateStr, datetimeStr, peopleFields)}

## ${emoji} ${typeLabel} | ${fullName} | ${friendlyTime}

${values.content || ""}

---
`;
          break;
        }
      }

      // Append to braindump.md file
      appendFileSync(braindumpPath, entry);

      showToast({
        title: "Entry Added",
        message: `"${values.title}" added to braindump.md`,
      });

      // Reset all form fields
      setSnippetType("idea");
      setTitle("");
      setContent("");
      setUrl("");
      setCompanyPrefix("KU");
      setLinkedinUrl("");
      setTags([]);
    } catch (error) {
      console.error("Error writing to braindump.md:", error);
      showToast({
        title: "Error",
        message: "Failed to add entry to braindump.md",
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
      <Form.Dropdown id="snippetType" title="Entry Type" value={snippetType} onChange={setSnippetType}>
        <Form.Dropdown.Item value="idea" title="💡 Quick Idea" />
        <Form.Dropdown.Item value="note" title="📝 Note to Self" />
        <Form.Dropdown.Item value="people" title="👤 Person/Contact" />
      </Form.Dropdown>

      <Form.TextArea
        id="title"
        title="Title"
        placeholder={snippetType === "people" ? "e.g., John Smith" : "Add 1-liner"}
        value={title}
        onChange={setTitle}
      />

      {snippetType !== "idea" && (
        <Form.TextArea
          id="content"
          title="Content"
          placeholder="Add or paste notes (optional)"
          value={content}
          onChange={setContent}
        />
      )}

      {snippetType === "note" && (
        <Form.TextField
          id="url"
          title="URL"
          placeholder="https://example.com (optional)"
          value={url}
          onChange={setUrl}
        />
      )}

      {snippetType === "people" && (
        <>
          <Form.Dropdown id="companyPrefix" title="Company" value={companyPrefix} onChange={setCompanyPrefix}>
            {configData.companyPrefixes.map((company) => (
              <Form.Dropdown.Item key={company.value} value={company.value} title={company.title} />
            ))}
          </Form.Dropdown>

          <Form.TextField
            id="linkedinUrl"
            title="LinkedIn URL"
            placeholder="https://linkedin.com/in/..."
            value={linkedinUrl}
            onChange={setLinkedinUrl}
          />

          <Form.TagPicker
            id="tags"
            title="Tags"
            value={tags}
            onChange={setTags}
            placeholder="Add relevant tags (optional)"
          >
            {configData.peopleTags.map((tag) => (
              <Form.TagPicker.Item key={tag} value={tag} title={tag} />
            ))}
          </Form.TagPicker>

          <Form.TextArea
            id="peopleNotes"
            title="Initial Notes"
            placeholder="Any quick notes about this person (optional)"
            value={content}
            onChange={setContent}
          />
        </>
      )}
    </Form>
  );
}
