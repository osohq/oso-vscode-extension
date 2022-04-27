import { resolve } from 'path';

import { runTests } from '@vscode/test-electron'; // eslint-disable-line node/no-unpublished-import
import { minVersion } from 'semver'; // eslint-disable-line node/no-unpublished-import

import { engines } from '../../package.json';

void (async function () {
  try {
    // Fetch the semver constraint from the 'engines' field in the extension's
    // package.json and test against the minimum satisfiable version.
    const minSupportedVSCodeVersion =
      minVersion(engines.vscode)?.toString() || engines.vscode;

    const extensionDevelopmentPath = resolve(__dirname, '../../..');

    const libraryExtensionTestsPath = resolve(__dirname, './library-suite');
    const libraryWorkspace = resolve(
      __dirname,
      '../../../test-fixtures/workspace/library.code-workspace'
    );
    await runTests({
      version: minSupportedVSCodeVersion,
      extensionDevelopmentPath,
      extensionTestsPath: libraryExtensionTestsPath,
      launchArgs: [
        libraryWorkspace,
        '--disable-extensions',
        '--disable-telemetry',
      ],
    });

    const cloudExtensionTestsPath = resolve(__dirname, './cloud-suite');
    const cloudWorkspace = resolve(
      __dirname,
      '../../../test-fixtures/workspace/cloud.code-workspace'
    );
    await runTests({
      version: minSupportedVSCodeVersion,
      extensionDevelopmentPath,
      extensionTestsPath: cloudExtensionTestsPath,
      launchArgs: [
        cloudWorkspace,
        '--disable-extensions',
        '--disable-telemetry',
      ],
    });
  } catch (e) {
    console.error(e);
    process.exitCode = 1;
  }
})();
