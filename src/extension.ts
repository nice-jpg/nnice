// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { error } from 'console';
import * as cp from 'child_process';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	const workspaceRoot = (vscode.workspace.workspaceFolders && (vscode.workspace.workspaceFolders.length > 0))
		? vscode.workspace.workspaceFolders[0].uri.fsPath : "nice-undefined";
		
	vscode.window.onDidEndTerminalShellExecution(event => {
		if (event.exitCode === 0) {
			push();
		}
	});
	
	const provider = new EwpCompilerViewProvider(context.extensionUri, workspaceRoot);
	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(EwpCompilerViewProvider.viewType, provider));
}

function push() {
	vscode.commands.executeCommand('workbench.action.terminal.newLocal').then(() => {
		const t = vscode.window.terminals[vscode.window.terminals.length - 1];
		if (t) {
			t.sendText("echo local");
		}
	});
}

function exec(command: string, options: cp.ExecOptions): Promise<{ stdout: string; stderr: string }> {
	return new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
		cp.exec(command, options, (error, stdout, stderr) => {
			if (error) {
				getOutputChannel().appendLine(error.message??"aa");
				getOutputChannel().show(true);
	
				reject({ error, stdout, stderr });
			}
			resolve({ stdout, stderr });
		});
	});
}

async function execCompile(command: string, cwd: string) {
	try {
		getOutputChannel().appendLine(command);
		const { stdout, stderr } = await exec(command, { cwd: cwd });
		if (stderr && stderr.length > 0) {
			getOutputChannel().appendLine(stderr);
			getOutputChannel().show(true);
		}
		if (stdout) {
			getOutputChannel().appendLine(stdout.toString());
			getOutputChannel().show(true);
		}
	} catch (err: any) {
		const channel = getOutputChannel();
		if (err.stderr) {
			channel.appendLine(err.stderr);
		}
		if (err.stdout) {
			channel.appendLine(err.stdout);
		}
		channel.appendLine('Auto detecting rake tasks failed.');
		channel.show(true);
	}

}

let _channel: vscode.OutputChannel;
function getOutputChannel(): vscode.OutputChannel {
	if (!_channel) {
		_channel = vscode.window.createOutputChannel('Ewp compile output');
	}
	return _channel;
}

class EwpCompilerViewProvider implements vscode.WebviewViewProvider {

	public static readonly viewType = 'nnice.ewpCompilerView';

	private _view?: vscode.WebviewView;

	constructor(
		private readonly _extensionUri: vscode.Uri,
		private readonly _workspaceRoot: string
	) { }

	public resolveWebviewView(
		webviewView: vscode.WebviewView,
		context: vscode.WebviewViewResolveContext,
		_token: vscode.CancellationToken,
	) {
		this._view = webviewView;

		webviewView.webview.options = {
			// Allow scripts in the webview
			enableScripts: true,

			localResourceRoots: [
				this._extensionUri
			]
		};

		webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

		webviewView.webview.onDidReceiveMessage(data => {
			switch (data.type) {
				case 'compile':
					{
						this.compile(data.value);
						break;
					}
				case 'other':
					{
						vscode.window.activeTerminal?.sendText("echo " + data.value);
						break;
					}
				default:
					break;
			}
		});
	}

	private compile(cmd: string) {
		const commandLine = "make " + cmd;
		// execCompile(commandLine, this._workspaceRoot);
		vscode.commands.executeCommand('workbench.action.terminal.new').then(() => {
			const t = vscode.window.terminals[vscode.window.terminals.length - 1];
			if (t) {
				t.sendText(commandLine);
			}
		});
	}


	private _getHtmlForWebview(webview: vscode.Webview) {
		// Get the local path to main script run in the webview, then convert it to a uri we can use in the webview.
		const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'main.js'));

		// Do the same for the stylesheet.
		const styleResetUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'reset.css'));
		const styleVSCodeUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'vscode.css'));
		const styleMainUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'main.css'));

		// Use a nonce to only allow a specific script to be run.
		const nonce = getNonce();

		return `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">

				<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">

				<meta name="viewport" content="width=device-width, initial-scale=1.0">

				<link href="${styleResetUri}" rel="stylesheet">
				<link href="${styleVSCodeUri}" rel="stylesheet">
				<link href="${styleMainUri}" rel="stylesheet">

				<title>Ewp Compile</title>
			</head>
			<body>
				<ul id="args" class="arg-list">
					<li><input name="ball" type="checkbox" value="ball1" checked="checked">ball1</li>
					<li><input name="ball" type="checkbox" value="ball2" checked="checked">ball2</li>
					<li><input name="ball" type="checkbox" value="ball3" checked="checked">ball3</li>
				</ul>
				<button id="sub">submit</button>

				<script nonce="${nonce}" src="${scriptUri}"></script>
			</body>
			</html>`;
	}
}

function getNonce() {
	let text = '';
	const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	for (let i = 0; i < 32; i++) {
		text += possible.charAt(Math.floor(Math.random() * possible.length));
	}
	return text;
}

// This method is called when your extension is deactivated
export function deactivate() {}
