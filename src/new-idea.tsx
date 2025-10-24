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
};

type AttendeesData = {
  defaultAttendee: string;
  suggestedAttendees: string[];
};

export default function Command() {
  const [snippetType, setSnippetType] = useState("idea");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [attendees, setAttendees] = useState<string[]>([]);
  const [additionalAttendees, setAdditionalAttendees] = useState("");
  const [url, setUrl] = useState("");
  const [tldr, setTldr] = useState("");
  const [attendeesData, setAttendeesData] = useState<AttendeesData>({ defaultAttendee: "You", suggestedAttendees: [] });

  // Load attendees data on component mount
  useEffect(() => {
    try {
      const attendeesPath = "/Users/hdga/Harry-Git/Raycast/lazyharry/src/attendees.json";
      const data = JSON.parse(readFileSync(attendeesPath, 'utf8'));
      setAttendeesData(data);
      // Pre-select only the default attendee for manual meetings
      setAttendees([data.defaultAttendee]);
    } catch (error) {
      console.error("Error loading attendees data:", error);
      // Fallback to default values
      setAttendeesData({ defaultAttendee: "You", suggestedAttendees: ["Charles", "Alexander"] });
      setAttendees(["You"]);
    }
  }, []);

  // Reset attendees when switching to meetings
  useEffect(() => {
    if (snippetType === "meeting") {
      setAttendees([attendeesData.defaultAttendee]);
    }
  }, [snippetType, attendeesData.defaultAttendee]);

  // Pre-populate fields with clipboard content when switching snippet types
  useEffect(() => {
    const populateFromClipboard = async () => {
      try {
        const clipboardText = await Clipboard.readText();
        if (!clipboardText) return;

        const trimmedText = clipboardText.trim();
        
        if (snippetType === "reference" && !url && isValidUrl(trimmedText)) {
          setUrl(trimmedText);
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
  }, [snippetType, url, content]);

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
      
      // Format entry based on snippet type
      switch (values.snippetType) {
        case "idea":
          entry = `---
type: idea
date: ${dateStr}
---
${datetimeStr} | ${values.title}

---
`;
          break;
          
        case "note":
          entry = `---
type: note
title: ${values.title}
date: ${dateStr}
---
${datetimeStr} | ${values.title}

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
          
          entry = `---
type: meeting
title: ${values.title}
date: ${dateStr}
attendees: [${allAttendees.map(a => `"${a}"`).join(', ')}]
---
# Meeting — ${values.title}

**Date:** ${datetimeStr}
**Attendees:** ${allAttendees.join(', ')}

${values.tldr ? `## TLDR\n${values.tldr}\n` : ''}## Notes
${values.content || ''}

---
`;
          break;
        }
          
        case "reference":
          entry = `---
type: reference
date: ${dateStr}
url: ${values.url || ''}
---
${datetimeStr} | ${values.title}

${values.content || ''}

---
`;
          break;
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
      setAttendees([attendeesData.defaultAttendee]);
      setAdditionalAttendees("");
      setUrl("");
      setTldr("");
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
      <Form.Description text="📝 Add notes to braindump.md." />
    
      <Form.TextArea 
        id="title" 
        title="Title" 
        placeholder="Add 1-liner"
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
          {attendeesData.suggestedAttendees.map((attendee) => (
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
    </Form>
  );
}
