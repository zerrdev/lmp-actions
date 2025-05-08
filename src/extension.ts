import * as vscode from 'vscode';
import { LmpActionsViewProvider } from './lmpActionsViewProvider';

export function activate(context: vscode.ExtensionContext) {
  console.log('Activating LMP actions extension');
  
  // Register the LmpActionsViewProvider for the webview view
  const provider = new LmpActionsViewProvider(context.extensionUri);
  
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      'lmpActionsView',
      provider,
      {
        webviewOptions: {
          retainContextWhenHidden: true
        }
      }
    )
  );

  // Register the extract command
  context.subscriptions.push(
    vscode.commands.registerCommand('lmpActions.extract', async () => {
      provider.extractFiles();
    })
  );

  // Register the "Copy as LMP" context menu command
  context.subscriptions.push(
    vscode.commands.registerCommand('lmpActions.copyAsLMP', async (uri: vscode.Uri) => {
      if (uri) {
        try {
          const stat = await vscode.workspace.fs.stat(uri);
          if (stat.type === vscode.FileType.Directory) {
            const lmpContent = await provider.folderAsLMP(uri.fsPath);
            await vscode.env.clipboard.writeText(lmpContent);
            vscode.window.showInformationMessage(`Folder "${uri.fsPath}" copied as LMP format`);
          } else {
            vscode.window.showWarningMessage('This command only works on folders');
          }
        } catch (error) {
          vscode.window.showErrorMessage(`Error: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    })
  );
  
  console.log('LMP actions extension activated successfully');
}

export function deactivate() {
  console.log('LMP actions extension deactivated');
}
