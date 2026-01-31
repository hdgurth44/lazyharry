import { Form, ActionPanel, Action, showToast } from "@raycast/api";
import { appendFileSync } from "fs";
import { useState, useEffect } from "react";
import configDataJson from "./config.json";
import { ConfigData, getEmojiForType, formatFriendlyTime, resolveBraindumpPath } from "./utils";

type Values = {
  project: string;
  content: string;
  nextSteps: string;
};

export default function Command() {
  const [project, setProject] = useState("");
  const [content, setContent] = useState("");
  const [nextSteps, setNextSteps] = useState("");
  const [contentError, setContentError] = useState<string | undefined>();
  const [configData, setConfigData] = useState<ConfigData>({
    defaultAttendee: "You",
    suggestedAttendees: [],
    companyPrefixes: [],
    peopleTags: [],
    braindumpCandidates: [],
    learningProjects: [],
  });

  // Load config data on component mount
  useEffect(() => {
    setConfigData(configDataJson);
    // Set default project to first in list
    if (configDataJson.learningProjects.length > 0) {
      setProject(configDataJson.learningProjects[0].value);
    }
  }, []);

  // Resolve braindump path from config
  const braindumpPath = resolveBraindumpPath(
    configData.braindumpCandidates.length > 0
      ? configData.braindumpCandidates
      : ["/Users/harry.angeles/Documents/harryGit/Hnotes/00Inbox/braindump.md"],
  );

  function validateContent(value: string): boolean {
    if (!value?.trim()) {
      setContentError("What you learned is required");
      return false;
    }
    setContentError(undefined);
    return true;
  }

  function handleSubmit(values: Values) {
    // Validation
    if (!validateContent(values.content)) {
      showToast({ title: "Error", message: "Please fix the form errors" });
      return;
    }

    try {
      const now = new Date();
      const dateStr = now.toISOString().split("T")[0];
      const friendlyTime = formatFriendlyTime(now);
      const emoji = getEmojiForType("learning");

      // Find selected project config
      const selectedProject = configData.learningProjects.find((p) => p.value === values.project);
      const obsidianPath = selectedProject?.obsidianPath || "";
      const linearUrl = selectedProject?.linearUrl;

      // Build metadata comments (obsidian line includes practice-log.md filename after |)
      const metadataLines = [
        `<!-- ENTRY: learning | ${dateStr} | ${friendlyTime} | project: ${values.project} -->`,
        `<!-- obsidian: ${obsidianPath} | practice-log.md -->`,
      ];
      if (linearUrl) {
        metadataLines.push(`<!-- linear: ${linearUrl} -->`);
      }

      // Build content with optional next steps
      let bodyContent = values.content.trim();
      if (values.nextSteps?.trim()) {
        bodyContent += `\n\n**Next steps:** ${values.nextSteps.trim()}`;
      }

      const entry = `${metadataLines.join("\n")}

## ${emoji} Learning | ${values.project} | ${friendlyTime}

${bodyContent}

---
`;

      // Append to braindump.md file
      appendFileSync(braindumpPath, entry);

      showToast({
        title: "Learning Entry Added",
        message: `"${values.project}" learning logged`,
      });

      // Reset form fields
      setProject(configData.learningProjects[0]?.value || "");
      setContent("");
      setNextSteps("");
      setContentError(undefined);
    } catch (error) {
      console.error("Error writing to braindump.md:", error);
      showToast({
        title: "Error",
        message: "Failed to add learning entry to braindump.md",
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
      <Form.Dropdown id="project" title="Project" value={project} onChange={setProject}>
        {configData.learningProjects.map((proj) => (
          <Form.Dropdown.Item key={proj.value} value={proj.value} title={proj.title} />
        ))}
      </Form.Dropdown>

      <Form.TextArea
        id="content"
        title="What I learned"
        placeholder="Describe what you learned"
        value={content}
        onChange={(value) => {
          setContent(value);
          if (contentError) validateContent(value);
        }}
        error={contentError}
        onBlur={(event) => validateContent(event.target.value ?? "")}
      />

      <Form.TextArea
        id="nextSteps"
        title="Next steps"
        placeholder="What to do next (optional)"
        value={nextSteps}
        onChange={setNextSteps}
      />
    </Form>
  );
}
