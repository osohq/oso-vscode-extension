import {
  Uri,
  window,
  workspace,
  WorkspaceFolder
} from 'vscode';
import * as vscode from 'vscode';
import { osoConfigKey } from './common';
import { spawnSync } from 'child_process';
import semverSatisfies = require('semver/functions/satisfies');
import * as os from 'os';
import { Executable } from 'vscode-languageclient/node';

const DEFAULT_OSO_CLOUD_BINARY_PATH = "oso-cloud";
const INSTALL_OSO_CLOUD_COMMAND = "curl -L https://cloud.osohq.com/install.sh | bash";
const OSO_CLOUD_PATH_CONFIG = "server.path";

/**
 * Returns an Executable for running the Polar LSP in the given workspace folder.
 * Also checks to ensure that the binary is installed and sufficiently new. If not, shows the user
 * the appropriate errors / prompts and returns false.
 */
export function getServerExecutableOrShowErrors(folder: WorkspaceFolder): Executable | false {
  const path = getBinaryPath(folder);

  if (!ensureBinaryExists(path)) {
    return false; // this function shows users an error message if necessary
  }
  if (!ensureBinaryIsFresh(path)) {
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
function getBinaryPath(folder: WorkspaceFolder): string {
  let customPath = workspace.getConfiguration(osoConfigKey, folder).get<string | null>(OSO_CLOUD_PATH_CONFIG);
  if (customPath !== null && customPath.startsWith("~/")) {
    customPath = os.homedir() + customPath.slice(1); // expand ~ into absolute path
  }
  const path = customPath ?? DEFAULT_OSO_CLOUD_BINARY_PATH; // TODO subscribe to changes?
  return path;
}

function installOsoCloud(terminalWindowTitle: string) {
  const terminal = window.createTerminal({ name: terminalWindowTitle });
  terminal.show();
  terminal.sendText(INSTALL_OSO_CLOUD_COMMAND);
  // TODO restart extension?
}

/**
 * Ensure the oso-cloud binary at the given path exists and is runnable.
 * Also prompts the user to install oso-cloud if necessary.
 * 
 * @returns true if the binary exists and runs successfully, else false
 */
function ensureBinaryExists(path: string): boolean {
  const response = spawnSync(path, ["version"]);
  const binaryExists = response.status === 0;

  if (!binaryExists) {
    if (path === DEFAULT_OSO_CLOUD_BINARY_PATH) {
      const installIt = "Install oso-cloud";
      const showMeInstructions = "Show install instructions";
      window.showErrorMessage(
        "Couldn't find an oso-cloud binary on your path." +
        " Install oso-cloud and add it to your path?",
        installIt,
        showMeInstructions
      ).then((selection) => {
        if (selection === installIt) {
          installOsoCloud("Install oso-cloud");
        } else if (selection === showMeInstructions) {
          vscode.env.openExternal(Uri.parse("https://www.osohq.com/docs/guides/develop/local-environment#install-the-oso-cloud-cli"));
        }
      });
    } else {
      window.showErrorMessage(
        `Couldn't find an oso-cloud binary at \`${path}\`. Either remove \`config.${OSO_CLOUD_PATH_CONFIG}\`` +
        " from your `settings.json` or ensure a runnable binary exists at that path."
      );
    }

  }
  return binaryExists;
}

function extractVersionInfo(osoCloudBinaryPath: string) {
  let response = spawnSync(osoCloudBinaryPath, ["version"]); // run `oso-cloud version`

  let stderr = response.stderr.toString('utf8');
  let updateAvailable = stderr.includes("update available");

  let versionOutput = response.stdout.toString('utf8');
  const match = versionOutput.match(/^version: (?<version>.+) sha: .+/);
  if (!match || !match.groups) {
    throw new Error(`Got an unexpected output format from \`${osoCloudBinaryPath} version\`- please double-check that this is a runnable oso-cloud binary.`);
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
function ensureBinaryIsFresh(path: string): boolean {
  const { version, updateAvailable } = extractVersionInfo(path);
  const tooOld = !semverSatisfies(version, ">=0.15.0"); // Minimum version that has `oso-cloud experimental lsp`

  if (tooOld) {
    const updateIt = "Update oso-cloud";
    const showMe = "Show me how";
    window.showErrorMessage(
      "This extension doesn't support your version of oso-cloud. To continue, update oso-cloud.",
      updateIt,
      showMe
    ).then((selection) => {
      if (selection === updateIt) {
        installOsoCloud("Update oso-cloud");
      } else if (selection === showMe) {
        vscode.env.openExternal(Uri.parse("https://www.osohq.com/docs/guides/develop/local-environment#install-the-oso-cloud-cli"));
      }
    });
  }
  if (updateAvailable && !tooOld) {
    const updateIt = "Update oso-cloud";
    const showMe = "Show me how";
    window.showWarningMessage(
      "An update is available to oso-cloud. Update it now?",
      updateIt,
      showMe
    ).then((selection) => {
      if (selection === updateIt) {
        installOsoCloud("Update oso-cloud");
      } else if (selection === showMe) {
        vscode.env.openExternal(Uri.parse("https://www.osohq.com/docs/guides/develop/local-environment#install-the-oso-cloud-cli"));
      }
    });
  }
  return !tooOld;
}
