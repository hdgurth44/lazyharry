# LazyHarry

It allows me to add a note from anywhere to my local notes file in /Users/hdga/Harry-Git/HNotes/00Inbox/braindump.md

---
title: Raycast Braindump Snippets
type: reference
tags: [raycast, snippets, productivity, inbox]
date: 2025-01-27
---

# Raycast Braindump Snippets

Ready-to-use Raycast snippets optimized for quick capture into `braindump.md` that work seamlessly with the `@inbox-cleaner` agent.

## Snippet Collection

### 1. Quick Idea
**Name:** `Braindump - Idea`  
**Use case:** Capturing random ideas, thoughts, product concepts

```
---
type: idea
title: {argument name="Idea title"}
date: {date format="yyyy-MM-dd"}
---
{datetime} | {argument name="Idea title"}

{clipboard}
{cursor}

---
```

### 2. Note to Self
**Name:** `Braindump - Note`  
**Use case:** General notes, reminders, observations that don't fit other categories

```
---
type: note
title: {argument name="Note title"}
date: {date format="yyyy-MM-dd"}
---
{datetime} | {argument name="Note title"}

{clipboard}
{cursor}

---
```

### 3. Meeting (Manual)
**Name:** `Braindump - Meeting Manual`  
**Use case:** Meetings where you took notes manually or recording wasn't possible

```
---
type: meeting
title: {argument name="Meeting title"}
date: {date format="yyyy-MM-dd"}
attendees: [{argument name="Attendees (comma-separated)"}]
project: {argument name="Project code (e.g., BR, WF)" default=""}
---
# Meeting — {argument name="Meeting title"}

**Date:** {datetime}
**Attendees:** {argument name="Attendees (comma-separated)"}

## Notes
{clipboard}
{cursor}

---
```

### 4. Meeting (Granola Paste)
**Name:** `Braindump - Meeting Granola`  
**Use case:** Pasting Granola transcripts - minimal frontmatter, ready for full paste

```
---
type: meeting
title: {argument name="Meeting title"}
date: {date format="yyyy-MM-dd"}
source: granola
---
#TLDR
{cursor}

{clipboard}

---
```

### 5. Reference/Link
**Name:** `Braindump - Reference`  
**Use case:** Articles, documentation, links to process later

```
---
type: reference
title: {argument name="Title"}
date: {date format="yyyy-MM-dd"}
url: {argument name="URL (optional)" default=""}
---
{datetime} | {argument name="Title"}

{clipboard}
{cursor}

---
```

## Setup Instructions

1. **Open Raycast** → Extensions → Snippets
2. **Create new snippet** for each template above
3. **Set snippet names** as specified (e.g., "Braindump - Idea")
4. **Copy the template code** (everything between the triple backticks)
5. **Set keyword** (optional): `bd-idea`, `bd-note`, `bd-meeting`, etc.

## Usage Workflow

1. **Capture:** Trigger Raycast snippet → fill arguments → paste into `braindump.md`
2. **Repeat:** Use throughout day/week as needed
3. **Process:** Run `/inbox` command when ready to organize
4. **File:** Inbox-cleaner splits entries and files to correct PARA location

## Design Benefits

- **Clear separators:** `---` boundaries for easy entry splitting
- **Consistent metadata:** YAML frontmatter matches inbox-cleaner expectations
- **Type taxonomy:** `idea`, `note`, `meeting`, `reference` for proper categorization
- **Optional fields:** Project codes and URLs available when needed
- **Cursor placement:** Positioned for immediate content entry

## Inbox-Cleaner Compatibility

These snippets are optimized for the `@inbox-cleaner` agent because they:
- Use clear `type` field for categorization
- Include `date` in YAML for sorting/filing
- Provide `title` for filename generation
- Use `---` separators for entry splitting
- Match existing template structure (like Charles meeting example)
- Include optional `project` field for routing to `01Projects/` folders
- Use `attendees` array matching existing meeting note format