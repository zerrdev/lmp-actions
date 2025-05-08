import * as vscode from 'vscode';
import { LmpOperator } from './lmpOperator';

export class LmpActionsViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'lmpActionsView';
  private _view?: vscode.WebviewView;

  constructor(
    private readonly _extensionUri: vscode.Uri,
    private readonly lmpOperator: LmpOperator = new LmpOperator()
  ) {}

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ) {
    console.log('Resolving LmpActionsViewProvider webview');
    
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri]
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    // Handle messages from the webview
    webviewView.webview.onDidReceiveMessage(async (data) => {
      console.log('Received message from webview:', data);
      
      switch (data.command) {
        case 'extract':
          if (data.textContent && data.outputDir) {
            try {
              await this.extractFilesImplementation(data.textContent, data.outputDir);
              vscode.window.showInformationMessage(`Files extracted to ${data.outputDir}`);
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : String(error);
              vscode.window.showErrorMessage(`Error extracting files: ${errorMessage}`);
              console.error('Extract error:', error);
            }
          } else {
            vscode.window.showErrorMessage('Please provide text content and output directory');
          }
          break;
          
        case 'selectDirectory':
          try {
            const folders = await vscode.window.showOpenDialog({
              canSelectFiles: false,
              canSelectFolders: true,
              canSelectMany: false,
              openLabel: 'Select Output Directory'
            });
            
            if (folders && folders.length > 0) {
              webviewView.webview.postMessage({
                type: 'directorySelected',
                directory: folders[0].fsPath
              });
            }
          } catch (error) {
            console.error('Error selecting directory:', error);
          }
          break;
      }
    });
    
    console.log('LmpActionsViewProvider webview resolved');
  }

  public async extractFiles() {
    if (!this._view) {
      vscode.window.showErrorMessage('Lmp actions view is not available');
      return;
    }

    this._view.webview.postMessage({ type: 'requestExtract' });
  }

  public async folderAsLMP(uri: string) {

    const config = vscode.workspace.getConfiguration('lmpActions');
    const configExcludePatterns = config.get<string[]>('excludePatterns') || [];
    const configExcludeExtensions = config.get<string[]>('excludeExtensions') || [];
    
    // Converter strings de padrões para RegExp
    const patternRegexps = configExcludePatterns.map(pattern => new RegExp(pattern));
    return await this.lmpOperator.copyFolderAsLmp(uri, {
      excludeExtensions: configExcludeExtensions,
      excludePatterns: patternRegexps
    });
  }

  private _getHtmlForWebview(webview: vscode.Webview): string {
    return `<!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src ${webview.cspSource} 'unsafe-inline'; connect-src ${webview.cspSource} vscode-webview:;">
      <title>Lmp actions</title>
      <style>
        body {
          padding: 10px;
          font-family: var(--vscode-font-family);
          color: var(--vscode-foreground);
        }
        
        .container {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        
        textarea {
          width: 100%;
          min-height: 150px;
          resize: vertical;
          padding: 8px;
          border: 1px solid var(--vscode-input-border);
          background-color: var(--vscode-input-background);
          color: var(--vscode-input-foreground);
        }
        
        input {
          width: 100%;
          padding: 6px 8px;
          border: 1px solid var(--vscode-input-border);
          background-color: var(--vscode-input-background);
          color: var(--vscode-input-foreground);
        }
        
        .directory-row {
          display: flex;
          gap: 5px;
        }
        
        .directory-row input {
          flex-grow: 1;
        }
        
        button {
          padding: 6px 12px;
          background-color: var(--vscode-button-background);
          color: var(--vscode-button-foreground);
          border: none;
          cursor: pointer;
        }
        
        button:hover {
          background-color: var(--vscode-button-hoverBackground);
        }
        
        .file-tree {
          max-height: 150px;
          overflow-y: auto;
          border: 1px solid var(--vscode-panel-border);
          background-color: var(--vscode-editor-background);
          padding: 5px;
          margin-top: 5px;
          margin-bottom: 5px;
        }
        
        .file-tree ul {
          list-style-type: none;
          padding-left: 20px;
          margin: 0;
        }
        
        .file-tree > ul {
          padding-left: 5px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h3>Lmp actions</h3>
        
        <label for="textContent">Paste file content:</label>
        <textarea id="textContent" placeholder="Paste your file content here..."></textarea>
        
        <div class="directory-row">
          <input type="text" id="outputDir" placeholder="Output directory..." readonly />
          <button id="browseButton">Browse</button>
        </div>
        
        <label>Files to be extracted:</label>
        <div class="file-tree" id="fileTree">
          <ul id="fileTreeList"></ul>
        </div>
        
        <button id="extractButton">Extract Files</button>
      </div>
      
      <script>
        (function() {
          const vscode = acquireVsCodeApi();
          
          const textContentEl = document.getElementById('textContent');
          const outputDirEl = document.getElementById('outputDir');
          const browseButtonEl = document.getElementById('browseButton');
          const extractButtonEl = document.getElementById('extractButton');
          const fileTreeListEl = document.getElementById('fileTreeList');
          
          browseButtonEl.addEventListener('click', () => {
            vscode.postMessage({
              command: 'selectDirectory'
            });
          });
          
          extractButtonEl.addEventListener('click', () => {
            const textContent = textContentEl.value;
            const outputDir = outputDirEl.value;
            
            if (!textContent) {
              alert('Please enter some text content');
              return;
            }
            
            if (!outputDir) {
              alert('Please select an output directory');
              return;
            }
            
            vscode.postMessage({
              command: 'extract',
              textContent: textContent,
              outputDir: outputDir
            });
          });
          
          textContentEl.addEventListener('input', updateFileTree);
          
          function updateFileTree() {
            const text = textContentEl.value;
            fileTreeListEl.innerHTML = '';
            
            const fileRegex = /\\[FILE_START: (.+?)\\]/g;
            let match;
            let files = [];
            
            while ((match = fileRegex.exec(text)) !== null) {
              files.push(match[1]);
            }
            
            if (files.length === 0) {
              const li = document.createElement('li');
              li.textContent = 'No files detected';
              fileTreeListEl.appendChild(li);
              return;
            }
            
            // Build tree structure
            const tree = {};
            for (const file of files) {
              const parts = file.split('/');
              let current = tree;
              
              for (let i = 0; i < parts.length; i++) {
                const part = parts[i];
                if (i === parts.length - 1) {
                  // It's a file
                  current[part] = null;
                } else {
                  // It's a directory
                  if (!current[part]) {
                    current[part] = {};
                  }
                  current = current[part];
                }
              }
            }
            
            // Render tree
            renderTree(tree, fileTreeListEl);
          }
          
          function renderTree(node, parentElement) {
            for (const key in node) {
              const li = document.createElement('li');
              
              if (node[key] === null) {
                // It's a file
                li.textContent = key;
              } else {
                // It's a directory
                li.textContent = key + '/';
                const ul = document.createElement('ul');
                renderTree(node[key], ul);
                li.appendChild(ul);
              }
              
              parentElement.appendChild(li);
            }
          }
          
          // Handle messages from the extension
          window.addEventListener('message', event => {
            const message = event.data;
            
            switch (message.type) {
              case 'directorySelected':
                outputDirEl.value = message.directory;
                break;
                
              case 'requestExtract':
                extractButtonEl.click();
                break;
            }
          });
          
          // Initialize file tree
          updateFileTree();
        })();
      </script>
    </body>
    </html>`;
  }

  private async extractFilesImplementation(textContent: string, outputDir: string): Promise<void> {
    try {
      // This is a placeholder that will be implemented by the user
      await this.doExtractFiles(textContent, outputDir);
    } catch (error) {
      console.error('Error in extractFilesImplementation:', error);
      throw error;
    }
  }

  // This method will be implemented by the user
  private async doExtractFiles(textContent: string, toDirectory: string): Promise<void> {
    // The implementation of this method will be provided by the user
    this.lmpOperator.extract({content: textContent}, toDirectory);
  }
}
