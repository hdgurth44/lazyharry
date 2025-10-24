import { Form, ActionPanel, Action, showToast } from "@raycast/api";
import { writeFileSync, appendFileSync } from "fs";

type Values = {
  title: string;
  content: string;
};

export default function Command() {
  function handleSubmit(values: Values) {
    try {
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0]; // yyyy-MM-dd format
      const datetimeStr = now.toISOString().replace('T', ' ').split('.')[0]; // yyyy-MM-dd HH:mm:ss format
      
      // Format the entry following the "Quick Idea" template
      const entry = `---
type: idea
title: ${values.title}
date: ${dateStr}
---
${datetimeStr} | ${values.title}

${values.content || ''}

---
`;

      // Append to braindump.md file
      const filePath = "/Users/hdga/Harry-Git/HNotes/00Inbox/braindump.md";
      appendFileSync(filePath, entry);
      
      showToast({ 
        title: "Idea Added", 
        message: `"${values.title}" added to braindump.md` 
      });
    } catch (error) {
      console.error("Error writing to braindump.md:", error);
      showToast({ 
        title: "Error", 
        message: "Failed to add idea to braindump.md" 
      });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} title="Add to Braindump" />
        </ActionPanel>
      }
    >
      <Form.Description text="Capture a quick idea and add it to your braindump.md file." />
      <Form.TextField 
        id="title" 
        title="Idea Title" 
        placeholder="Enter your idea title" 
      />
      <Form.TextArea 
        id="content" 
        title="Content" 
        placeholder="Add additional notes or paste content here (optional)" 
      />
    </Form>
  );
}
