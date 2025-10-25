import { Form, ActionPanel, Action, showToast, Clipboard } from "@raycast/api";
import { readFileSync, writeFileSync } from "fs";
import { useState, useEffect } from "react";

type TaskValues = {
  title: string;
  description: string;
  priority: string;
  dueDate: Date | null;
  tags: string[];
  status: string;
  url: string;
};

// Helper function to validate URL
function isValidUrl(string: string): boolean {
  try {
    const url = new URL(string);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

// Helper function to format date as "Oct 25, 1:07pm"
function formatFriendlyDateTime(date: Date): string {
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const month = monthNames[date.getMonth()];
  const day = date.getDate();

  const hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? "pm" : "am";
  const displayHours = hours % 12 || 12;
  const timeStr = `${displayHours}:${minutes.toString().padStart(2, "0")}${ampm}`;

  return `${month} ${day}, ${timeStr}`;
}

export default function Command() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [status, setStatus] = useState("todo");
  const [url, setUrl] = useState("");

  // Check clipboard for URL on component mount
  useEffect(() => {
    async function checkClipboard() {
      try {
        const clipboardText = await Clipboard.readText();
        if (clipboardText && isValidUrl(clipboardText)) {
          setUrl(clipboardText);
        }
      } catch (error) {
        console.log("Could not read clipboard:", error);
      }
    }
    checkClipboard();
  }, []);

  function handleSubmit(values: TaskValues) {
    try {
      const now = new Date();

      // Build the task entry
      let taskEntry = "";

      // Task checkbox based on status (text-based)
      const checkbox =
        {
          todo: "[ ]",
          "in-progress": "[>]",
          "on-hold": "[...]",
          completed: "[x]",
        }[values.status] || "[ ]";

      // Priority emoji only (no text label)
      const priorityEmoji =
        {
          high: "🔥",
          medium: "🧘",
          low: "🧊",
        }[values.priority] || "🧘";

      // Build header: ## [ ] | 🧘 | Oct 27, 3:37pm | Title (with due date if present)
      if (values.dueDate) {
        taskEntry = `## ${checkbox} | ${priorityEmoji} | ${formatFriendlyDateTime(values.dueDate)} | ${values.title}\n`;
      } else {
        taskEntry = `## ${checkbox} | ${priorityEmoji} | ${values.title}\n`;
      }

      // Build metadata comment
      const metadataParts = [`Created: ${formatFriendlyDateTime(now)}`];

      // Due date (format as "Oct 25, 1:07pm")
      if (values.dueDate) {
        metadataParts.push(`Due: ${formatFriendlyDateTime(values.dueDate)}`);
      }

      // Tags
      if (values.tags.length > 0) {
        metadataParts.push(`tags: ${values.tags.join(", ")}`);
      }

      // URL
      if (values.url) {
        metadataParts.push(`URL: ${values.url}`);
      }

      // Add metadata comment
      taskEntry += `<!-- ${metadataParts.join(" | ")} -->\n`;

      // Add description if provided (no space between metadata and description)
      if (values.description) {
        taskEntry += `${values.description}\n`;
      }

      // Prepend to tasks.md file
      const filePath = "/Users/hdga/Harry-Git/HNotes/00Inbox/tasks.md";

      let existingContent = "";
      try {
        existingContent = readFileSync(filePath, "utf8");
      } catch {
        // File doesn't exist yet, which is fine
        console.log("tasks.md doesn't exist yet, creating it");
      }

      // Prepend new task to existing content
      const newContent = taskEntry + existingContent;
      writeFileSync(filePath, newContent);

      showToast({
        title: "Task Added",
        message: `"${values.title}" added to tasks.md`,
      });

      // Reset all form fields
      setTitle("");
      setDescription("");
      setPriority("medium");
      setDueDate(null);
      setTags([]);
      setStatus("todo");
      setUrl("");
    } catch (error) {
      console.error("Error writing to tasks.md:", error);
      showToast({
        title: "Error",
        message: "Failed to add task to tasks.md",
      });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} title="Add Task" />
          <Action.Open
            title="Open in Cursor"
            target="/Users/hdga/Harry-Git/HNotes/00Inbox/tasks.md"
            application="Cursor"
          />
        </ActionPanel>
      }
    >
      {/* <Form.Description text="✅ Add to tasks.md" /> */}

      <Form.TextField
        id="title"
        title="Task Title"
        placeholder="What needs to be done?"
        value={title}
        onChange={setTitle}
      />

      <Form.DatePicker id="dueDate" title="Due Date" value={dueDate} onChange={setDueDate} />

      <Form.Dropdown id="priority" title="Priority" value={priority} onChange={setPriority}>
        <Form.Dropdown.Item value="high" title="🔥" />
        <Form.Dropdown.Item value="medium" title="🧘" />
        <Form.Dropdown.Item value="low" title="🧊" />
      </Form.Dropdown>
      <Form.TextArea
        id="description"
        title="Description"
        placeholder="Additional details (optional)"
        value={description}
        onChange={setDescription}
      />

      <Form.TextField
        id="url"
        title="URL"
        placeholder="Related link (optional)"
        value={url}
        onChange={setUrl}
      />

      <Form.TagPicker id="tags" title="Tags" value={tags} onChange={setTags} placeholder="Add tags (optional)">
        <Form.TagPicker.Item value="work" title="work" />
        <Form.TagPicker.Item value="personal" title="personal" />
        <Form.TagPicker.Item value="urgent" title="urgent" />
        <Form.TagPicker.Item value="important" title="important" />
        <Form.TagPicker.Item value="later" title="later" />
        <Form.TagPicker.Item value="today" title="today" />
      </Form.TagPicker>

      <Form.Dropdown id="status" title="Status" value={status} onChange={setStatus}>
        <Form.Dropdown.Item value="todo" title="⬜ To Do" />
        <Form.Dropdown.Item value="in-progress" title="🏃 In Progress" />
        <Form.Dropdown.Item value="on-hold" title="✋ On Hold" />
        <Form.Dropdown.Item value="completed" title="✅ Completed" />
      </Form.Dropdown>
    </Form>
  );
}
