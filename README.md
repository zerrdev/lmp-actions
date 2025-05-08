# LMP actions for VS Code

## Description

LMP actions is a Visual Studio Code extension that simplifies working with files in the LMP (Lumped Files) format. The extension offers two main functionalities:

1. **File Extraction**: Extracts files contained in a text in LMP format and writes them to the file system.
2. **Directory Copy as LMP**: Allows copying an entire directory structure to the clipboard in LMP format.

## LMP Format

The LMP format is a way to group multiple files into a single text block, where each file is delimited by specific markers:

- File start: `[FILE_START: path/to/file.extension]`
- File end: `[FILE_END: path/to/file.extension]`

Example:
```
[FILE_START: src/index.js]
console.log('Hello World');
[FILE_END: src/index.js]

[FILE_START: src/styles.css]
body {
  background-color: #f0f0f0;
}
[FILE_END: src/styles.css]
```

## Using with LLMs
When working with AI language models, you can use the following prefix in your prompts to request responses in LMP format:  
```
When providing solutions that require multiple files, please use the LMP format:
- Start each file with: [FILE_START: path/to/file.ext]
- End each file with: [FILE_END: path/to/file.ext]
- Include all necessary files with proper directory structure
- All the lmp in a single code block
---
```
This helps ensure that the AI's response can be directly processed by the LMP actions extension.  

## Features

### LMP actions View

The extension adds a new view in the VS Code activity bar called "LMP actions". This view allows you to:

- Paste text in LMP format
- View the files contained in the text
- Extract the files to the file system

### Context Menu for Directories

The extension adds a context menu item "Copy as LMP" when you right-click on a directory in the file explorer. This option copies the entire directory content to the clipboard in LMP format.

## Commands

The extension provides the following commands:

- `lmpActions.extract`: Extracts files from text in LMP format
- `lmpActions.copyAsLMP`: Copies a directory as text in LMP format

## Settings

The extension can be configured through the following options:

### Exclude Patterns

You can configure which folders should be ignored when copying a directory as LMP:

```
"lmpActions.excludePatterns": [
  "node_modules",
  ".git",
  ".vscode",
  "dist/",
  "build/",
  // ... other patterns
]
```

By default, the extension excludes common folders like `node_modules`, `.git`, `.vscode`, and various build and cache folders.

### Excluded Extensions

You can configure which file extensions should be ignored:

```
"lmpActions.excludeExtensions": [
  ".md"
]
```

By default, the extension excludes `.md` files.

## How to Use

### Extract Files from LMP Text

1. Click on the "Lmp actions" icon in the activity bar
2. Paste the text in LMP format into the view
3. Click the "Extract Files" button
4. Select the directory where the files will be extracted

### Copy a Directory as LMP

1. Right-click on a directory in the file explorer
2. Select "Copy as LMP" from the context menu
3. The directory content will be copied to the clipboard in LMP format

## Installation

1. Open VS Code
2. Access the extensions view (Ctrl+Shift+X)
3. Search for "LMP actions"
4. Click "Install"

## Requirements

- Visual Studio Code version 1.60.0 or higher

## Contribution

Contributions are welcome! Feel free to open issues or pull requests in the repository.

## License

This extension is licensed under the [MIT License](LICENSE).
