import { Form, ActionPanel, Action, showToast, Clipboard } from "@raycast/api";
import { appendFileSync, readFileSync } from "fs";
import { useState, useEffect } from "react";

type Values = {
  snippetType: string;
  title: string;
  content: string;
  attendees: string[];
  additionalAttendees: string;
  url: string;
  tldr: string;
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
  const [attendees, setAttendees] = useState<string[]>([]);
  const [additionalAttendees, setAdditionalAttendees] = useState("");
  const [url, setUrl] = useState("");
  const [tldr, setTldr] = useState("");
  const [configData, setConfigData] = useState<ConfigData>({ 
    defaultAttendee: "You", 
    suggestedAttendees: [],
    companyPrefixes: [],
    peopleTags: []
  });
  // State variables for people type
  const [companyPrefix, setCompanyPrefix] = useState("BR");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [tags, setTags] = useState<string[]>([]);

  // Load config data on component mount
  useEffect(() => {
    try {
      const configPath = "/Users/hdga/Harry-Git/Raycast/lazyharry/src/config.json";
      const data = JSON.parse(readFileSync(configPath, 'utf8'));
      setConfigData(data);
      // Pre-select only the default attendee for manual meetings
      setAttendees([data.defaultAttendee]);
    } catch (error) {
      console.error("Error loading config data:", error);
      // Fallback to default values
      setConfigData({ 
        defaultAttendee: "You", 
        suggestedAttendees: ["Charles", "Alexander"],
        companyPrefixes: [{ value: "BR", title: "BR (BeReal)" }],
        peopleTags: ["manager", "peer"]
      });
      setAttendees(["You"]);
    }
  }, []);

  // Reset attendees when switching to meetings
  useEffect(() => {
    if (snippetType === "meeting") {
      setAttendees([configData.defaultAttendee]);
    }
  }, [snippetType, configData.defaultAttendee]);

  // Pre-populate fields with clipboard content when switching snippet types
  useEffect(() => {
    const populateFromClipboard = async () => {
      try {
        const clipboardText = await Clipboard.readText();
        if (!clipboardText) return;

        const trimmedText = clipboardText.trim();
        
        if (snippetType === "reference" && !url && isValidUrl(trimmedText)) {
          setUrl(trimmedText);
        } else if (snippetType === "people" && !linkedinUrl && isValidUrl(trimmedText)) {
          setLinkedinUrl(trimmedText);
        } else if (
          (snippetType === "note" || snippetType === "meeting") 
          && !content
        ) {
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
          
        case "note":
          entry = `${formatMetadataComment("note", dateStr, datetimeStr, [`title: ${values.title}`])}

## ${emoji} ${typeLabel} | ${values.title} | ${friendlyTime}

${values.content || ''}

---
`;
          break;
          
        case "meeting": {
          // Combine selected attendees with additional attendees
          const additionalAttendeesList = values.additionalAttendees
            ? values.additionalAttendees.split(',').map(name => name.trim()).filter(name => name.length > 0)
            : [];
          const allAttendees = [...values.attendees, ...additionalAttendeesList];
          const attendeesStr = allAttendees.join(', ');
          
          const meetingFields = [`title: ${values.title}`, `attendees: ${attendeesStr}`];
          
          entry = `${formatMetadataComment("meeting", dateStr, datetimeStr, meetingFields)}

## ${emoji} ${typeLabel} | ${values.title} | ${friendlyTime}

${values.tldr ? `${values.tldr}\n\n` : ''}${values.content || ''}

---
`;
          break;
        }
          
        case "reference": {
          const referenceFields = [];
          if (values.title) referenceFields.push(`title: ${values.title}`);
          if (values.url) referenceFields.push(`url: ${values.url}`);
          
          entry = `${formatMetadataComment("reference", dateStr, datetimeStr, referenceFields)}

## ${emoji} ${typeLabel} | ${values.title || 'Reference'} | ${friendlyTime}

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
      const filePath = "/Users/hdga/Harry-Git/HNotes/00Inbox/braindump.md";
      appendFileSync(filePath, entry);
      
      showToast({ 
        title: "Entry Added", 
        message: `"${values.title}" added to braindump.md` 
      });
      
      // Reset all form fields
      setSnippetType("idea");
      setTitle("");
      setContent("");
      setAttendees([configData.defaultAttendee]);
      setAdditionalAttendees("");
      setUrl("");
      setTldr("");
      setCompanyPrefix("BR");
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
            target="/Users/hdga/Harry-Git/HNotes/00Inbox/braindump.md"
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
        <Form.Dropdown.Item value="meeting" title="🙋 Meeting" />
        <Form.Dropdown.Item value="reference" title="🔗 Reference/Link" />
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
      
      {snippetType === "reference" && (
        <Form.TextField 
          id="url" 
          title="URL" 
          placeholder="https://example.com (optional)"
          value={url}
          onChange={setUrl}
        />
      )}
      
      {snippetType === "meeting" && (
        <Form.TextArea 
          id="tldr" 
          title="TLDR" 
          placeholder="Add quick personal notes (optional)"
          value={tldr}
          onChange={setTldr}
        />
      )}
      
      {snippetType === "meeting" && (
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
      )}
      
      {snippetType === "meeting" && (
        <Form.TextField 
          id="additionalAttendees" 
          title="Additional attendees" 
          placeholder="e.g., John, Jane, Bob"
          value={additionalAttendees}
          onChange={setAdditionalAttendees}
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
            id="content" 
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
