# LazyHarry - Raycast Extension

A custom Raycast extension that allows you to quickly capture ideas and append them to your local braindump file.

## Overview

This extension provides a simple form interface to capture "Quick Idea" entries and automatically append them to `/Users/hdga/Harry-Git/HNotes/00Inbox/braindump.md` with proper YAML frontmatter formatting that's compatible with the `@inbox-cleaner` agent.

## Features

- **Quick Idea Capture**: Simple form with title and optional content fields
- **Automatic Formatting**: Entries are formatted with proper YAML frontmatter and timestamps
- **File Integration**: Directly appends to your braindump.md file
- **Open in Cursor**: Secondary action to open the braindump file in Cursor for review/editing
- **Form Reset**: Fields automatically clear after successful submission for quick successive entries

## Usage

1. **Launch**: Open Raycast and run "New Idea" command
2. **Fill Form**: Enter your idea title (required) and optional content
3. **Submit**: Click "Add to Braindump" to append the entry
4. **Optional**: Use "Open in Cursor" action to view/edit the full braindump file

## Technical Details

### Entry Format
Each entry follows the "Quick Idea" template structure:
```yaml
---
type: idea
title: Your Idea Title
date: 2025-01-27
---
2025-01-27 14:30:00 | Your Idea Title

Your content here...

---
```

### File Path
- **Target File**: `/Users/hdga/Harry-Git/HNotes/00Inbox/braindump.md`
- **Operation**: Append (preserves existing content)
- **Encoding**: UTF-8

### Date Formatting
- **Frontmatter Date**: `yyyy-MM-dd` format
- **Timestamp Line**: `yyyy-MM-dd HH:mm:ss` format

## Development

### Project Structure
```
lazyharry/
├── src/
│   └── new-idea.tsx    # Main extension component
├── assets/
│   └── extension-icon.png
├── package.json
└── README.md
```

### Key Dependencies
- `@raycast/api`: Raycast extension framework
- `@raycast/utils`: Raycast utilities
- `fs`: Node.js file system operations

### Form State Management
- Uses React `useState` for controlled form inputs
- Automatic field reset after successful submission
- Error handling with user-friendly toast notifications

## Related Documentation

- **[Raycast Snippets](RAYCAST_SNIPPETS.md)**: Alternative approach using Raycast snippets for braindump capture
- **Inbox-Cleaner Agent**: Processes braindump entries and files them to appropriate PARA locations

## Future Enhancements

- Support for additional entry types (notes, meetings, references)
- Dropdown to select entry type
- Integration with additional note-taking workflows