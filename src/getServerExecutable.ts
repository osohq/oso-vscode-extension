import * as vscode from 'vscode';
import { osoConfigKey, restartServerEvent, serverPathKey } from './common';
import { spawnSync } from 'child_process';
import semverSatisfies = require('semver/functions/satisfies');
import * as os from 'os';
import { Executable } from 'vscode-languageclient/node';

const DEFAULT_OSO_CLOUD_BINARY_PATH = 'oso-cloud';

/**
 * Returns an Executable for running the Polar LSP in the given workspace folder.
 * Also checks to ensure that the binary is installed and sufficiently new. If not, shows the user
 * the appropriate errors / prompts and returns false.
 */
export function getServerExecutableOrShowErrors(
  folder: vscode.WorkspaceFolder,
  ctx: vscode.ExtensionContext
): Executable | false {
  const path = getBinaryPath(folder);

  if (!ensureBinaryExists(path, ctx)) {
    return false; // this function shows users an error message if necessary
  }
  if (!ensureBinaryIsFresh(path, ctx)) {
    return false; // this function shows users an error message if necessary
  }

  return {
    command: path,
    args: ['experimental', 'lsp'],
  };
}

/**
 * @returns the configured path to the oso-cloud binary for this workspace
 */
function getBinaryPath(folder: vscode.WorkspaceFolder): string {
  let customPath = vscode.workspace
    .getConfiguration(osoConfigKey, folder)
    .get<string | null>(serverPathKey);
  if (customPath !== null && customPath.startsWith('~/')) {
    customPath = os.homedir() + customPath.slice(1); // expand ~ into absolute path
  }
  const path = customPath ?? DEFAULT_OSO_CLOUD_BINARY_PATH;
  return path;
}

function installOsoCloud(
  terminalWindowTitle: string,
  ctx: vscode.ExtensionContext
) {
  const terminal = vscode.window.createTerminal({ name: terminalWindowTitle });
  ctx.subscriptions.push(
    vscode.window.onDidCloseTerminal(async t => {
      if (t === terminal && t.exitStatus.code === 0) {
        await vscode.commands.executeCommand(restartServerEvent);
      }
    })
  );
  terminal.show();
  terminal.sendText('set -o pipefail'); // So we can keep the window open if the installation fails
  // TODO might be nice if we could keep the terminal window open after exiting the process, so users
  // can see what we did. not entirely sure if this is possible.
  terminal.sendText(
    'curl -L https://cloud.osohq.com/install.sh | bash && exit'
  );
}

function openCLIDocs() {
  vscode.env.openExternal(
    vscode.Uri.parse(
      'https://www.osohq.com/docs/guides/develop/local-environment#install-the-oso-cloud-cli'
    )
  );
}

/**
 * Ensure the oso-cloud binary at the given path exists and is runnable.
 * Also prompts the user to install oso-cloud if necessary.
 *
 * @returns true if the binary exists and runs successfully, else false
 */
function ensureBinaryExists(
  path: string,
  ctx: vscode.ExtensionContext
): boolean {
  const response = spawnSync(path, ['version']);
  const binaryExists = response.status === 0;

  if (!binaryExists) {
    if (path === DEFAULT_OSO_CLOUD_BINARY_PATH) {
      const installIt = 'Install oso-cloud';
      const showMeInstructions = 'Show install instructions';
      vscode.window
        .showErrorMessage(
          "Couldn't find an oso-cloud binary on your path." +
            ' Install oso-cloud and add it to your path?',
          installIt,
          showMeInstructions
        )
        .then(selection => {
          if (selection === installIt) {
            installOsoCloud('Install oso-cloud', ctx);
          } else if (selection === showMeInstructions) {
            openCLIDocs();
          }
        });
    } else {
      vscode.window.showErrorMessage(
        `Couldn't find an oso-cloud binary at \`${path}\`. Either remove \`${osoConfigKey}.${serverPathKey}\`` +
          ' from your `settings.json` or ensure a runnable binary exists at that path.'
      );
    }
  }
  return binaryExists;
}

function extractVersionInfo(osoCloudBinaryPath: string) {
  let response = spawnSync(osoCloudBinaryPath, ['version']); // run `oso-cloud version`

  let stderr = response.stderr.toString('utf8');
  let updateAvailable = stderr.includes('update available');

  let versionOutput = response.stdout.toString('utf8');
  const match = versionOutput.match(/^version: (?<version>.+) sha: .+/);
  if (!match || !match.groups) {
    throw new Error(
      `Got an unexpected output format from \`${osoCloudBinaryPath} version\`- please double-check that this is a runnable oso-cloud binary.`
    );
  }
  const { version } = match.groups;

  return { version, updateAvailable };
}

/**
 * Check the version of the oso-cloud binary at the given path.
 * Also prompts the user to upgrade their version of oso-cloud if an update is available.
 *
 * @return true if the oso-cloud binary at the given path is recent enough to support the Polar LSP, else false
 */
function ensureBinaryIsFresh(
  path: string,
  ctx: vscode.ExtensionContext
): boolean {
  return true;
  const { version, updateAvailable } = extractVersionInfo(path);
  const tooOld = !semverSatisfies(version, '>=0.15.0'); // Minimum version that has `oso-cloud experimental lsp`

  if (tooOld) {
    const updateIt = 'Update oso-cloud';
    const showMe = 'Show me how';
    vscode.window
      .showErrorMessage(
        "This extension doesn't support your version of oso-cloud. To continue, update oso-cloud.",
        updateIt,
        showMe
      )
      .then(selection => {
        if (selection === updateIt) {
          installOsoCloud('Update oso-cloud', ctx);
        } else if (selection === showMe) {
          openCLIDocs();
        }
      });
  }
  if (updateAvailable && !tooOld) {
    const updateIt = 'Update oso-cloud';
    const showMe = 'Show me how';
    vscode.window
      .showWarningMessage(
        'An update is available to oso-cloud. Update it now?',
        updateIt,
        showMe
      )
      .then(selection => {
        if (selection === updateIt) {
          installOsoCloud('Update oso-cloud', ctx);
        } else if (selection === showMe) {
          openCLIDocs();
        }
      });
  }
  return !tooOld;
}
