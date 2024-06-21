# Development

## Language Server Protocol (LSP) Functionality

### Requirements

- VS Code 1.78.0+.

### Steps to test the extension out in VS Code

1. Open this directory in VS Code
2. Select the `Run->Start Debugging` menu option (or press  F5).

### Steps to build a release version of the extension

1. Run `yarn run package` in the current directory (where
   this file lives).
2. The resulting `oso.vsix` file can be installed into any VS Code
   instance via: `code --install-extension oso.vsix`.

### Publishing

#### Prerequisites

- Bump the `version` in `package.json`.
- Make sure the PR is merged into `main` and you've pulled down the latest for `main` after merging.
- Download oso.vsix from GitHub:
   - Navigate to the [Actions][https://github.com/osohq/oso-vscode-extension/actions] tab.
   - In the sidebar, select "Release VSCode Extension" from the list of workflows.
   - Click on the most recent workflow run that you created.
   - Scroll down to the Artifacts section and download `oso_vscode_extension.zip` which contains `oso.vsix`.
   - Move `oso.vsix` to the `oso-vscode-extension` directory.
- Run `make submodules` in the `oso-vscode-extension` directory (if you haven't already done so in this project).
- Run `yarn` (if you haven't already done so in this project).
- Login to Visual Studio Marketplace (the PAT is in 1Password: VSCode publish
  api key):

   ```console
   yarn vsce login osohq
   ```

#### Publish to Visual Studio Marketplace

- Run `yarn run publish`.

#### Publish to Open VSX Registry

- Run `export PAT={the PAT is in 1Password: Open VSX}`.
- Publish to the Open VSX Registry:

   ```bash
   yarn ovsx publish -p ${PAT} oso.vsix
   ```
