import { Form, ActionPanel, Action, showToast, Clipboard } from "@raycast/api";
import { existsSync, mkdirSync, appendFileSync, writeFileSync } from "fs";
import { dirname } from "path";
import { useState, useEffect } from "react";
import configDataJson from "./config.json";

type Values = {
  snippetType: string;
  title: string;
  content: string;
  url: string;
  companyPrefix: string;
  linkedinUrl: string;
  tags: string[];
};

// Helper function to get emoji for entry type
function getEmojiForType(type: string): string {
  const emojiMap: { [key: string]: string } = {
    idea: "💡",
    note: "📝",
    meeting: "🤝",
    task: "✅",
    reference: "🔗",
    people: "👤"
  };
  return emojiMap[type] || "📝";
}

// Helper function to capitalize type name
function capitalizeType(type: string): string {
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
function formatMetadataComment(type: string, date: string, time: string, additionalFields: string[]): string {
  const base = `<!-- ENTRY: ${type} | ${date} | ${time}`;
  const fields = additionalFields.join(' | ');
  return fields ? `${base} | ${fields} -->` : `${base} -->`;
}

type ConfigData = {
  defaultAttendee: string;
  suggestedAttendees: string[];
  companyPrefixes: Array<{ value: string; title: string }>;
  peopleTags: string[];
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
    peopleTags: []
  });
  // State variables for people type
  const [companyPrefix, setCompanyPrefix] = useState("KU");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [tags, setTags] = useState<string[]>([]);

  // Load config data on component mount
  useEffect(() => {
    setConfigData(configDataJson);
  }, []);

  // Resolve braindump path for this machine (supports multiple locations)
  const braindumpCandidates = [
    "/Users/harry.angeles/Documents/harryGit/Hnotes/00Inbox/braindump.md",
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

  // Pre-populate fields with clipboard content when switching snippet types
  useEffect(() => {
    const populateFromClipboard = async () => {
      try {
        const clipboardText = await Clipboard.readText();
        if (!clipboardText) return;

        const trimmedText = clipboardText.trim();

        if (snippetType === "note" && !url && isValidUrl(trimmedText)) {
          setUrl(trimmedText);
        } else if (snippetType === "people" && !linkedinUrl && isValidUrl(trimmedText)) {
          setLinkedinUrl(trimmedText);
        } else if (snippetType === "note" && !content) {
          setContent(trimmedText);
        }
      } catch (error) {
        console.error("Error reading clipboard:", error);
      }
    };

    populateFromClipboard();
  }, [snippetType, url, content, linkedinUrl]);

  // Helper function to check if text looks like a URL
  const isValidUrl = (text: string): boolean => {
    try {
      new URL(text);
      return true;
    } catch {
      // Also check for common URL patterns that might not pass URL constructor
      const urlPattern = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/i;
      return urlPattern.test(text);
    }
  };

  function handleSubmit(values: Values) {
    try {
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0]; // yyyy-MM-dd format
      const datetimeStr = now.toISOString().replace('T', ' ').split('.')[0]; // yyyy-MM-dd HH:mm:ss format
      
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

${values.content || ''}

---
`;
          break;
        }

        case "people": {
          const tagsList = values.tags.length > 0 ? values.tags.join(', ') : '';
          const fullName = `${values.companyPrefix} — ${values.title}`;
          const peopleFields = [
            `title: ${fullName}`,
            `company: ${values.companyPrefix}`
          ];
          if (values.linkedinUrl) peopleFields.push(`linkedin: ${values.linkedinUrl}`);
          if (tagsList) peopleFields.push(`tags: ${tagsList}`);
          
          entry = `${formatMetadataComment("people", dateStr, datetimeStr, peopleFields)}

## ${emoji} ${typeLabel} | ${fullName} | ${friendlyTime}

${values.content || ''}

---
`;
          break;
        }
      }

      // Append to braindump.md file
      appendFileSync(braindumpPath, entry);
      
      showToast({ 
        title: "Entry Added", 
        message: `"${values.title}" added to braindump.md` 
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
        message: "Failed to add entry to braindump.md" 
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
      {/* <Form.Description text="📝 Add notes to braindump.md." /> */}
    
      <Form.TextArea 
        id="title" 
        title="Title" 
        placeholder={snippetType === "people" ? "e.g., John Smith" : "Add 1-liner"}
        value={title}
        onChange={setTitle}
      />
      
      <Form.Dropdown
        id="snippetType"
        title="Entry Type"
        value={snippetType}
        onChange={setSnippetType}
      >
        <Form.Dropdown.Item value="idea" title="💡 Quick Idea" />
        <Form.Dropdown.Item value="note" title="📝 Note to Self" />
        <Form.Dropdown.Item value="people" title="👤 Person/Contact" />
      </Form.Dropdown>
      
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
          <Form.Dropdown
            id="companyPrefix"
            title="Company"
            value={companyPrefix}
            onChange={setCompanyPrefix}
          >
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
