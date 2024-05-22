# Development

## Language Server Protocol (LSP) Functionality

### Requirements

- Latest stable version of Rust with `cargo` available on your system PATH.
- [`wasm-pack`][wasm-pack] 0.9.1+ installed and available on your system PATH.
- VS Code 1.52.0+.

### Steps to test the extension out in VS Code

1. Open this directory in VS Code
2. Select the `Run->Start Debugging` menu option (or press  F5).
3. To open a workspace used in the integration tests, select the
   `File->Open Workspace from File...` menu option and select a
   `test-fixtures/workspace/<NAME>.code-workspace` file.

### Steps to build a release version of the extension

1. Run `make CARGO_FLAGS=--release package` in the current directory (where
   this file lives).
2. The resulting `oso-X.Y.Z.vsix` file can be installed into any VS Code
   instance via: `code --install-extension oso-X.Y.Z.vsix`.

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

### Running tests

#### Server

Tests for the server live in the `oso/polar-language-server` crate. Run `make -C
oso/polar-language-server test`.

#### Client

Tests for the client live in the `./test` directory relative to this file. Run
`make test` in the current directory (where this file lives), which invokes
`yarn test`, which:

- Calls `tsc --build test` to build the TypeScript project in the `./test`
  directory.
- Calls `yarn esbuild-all` to build the `./out/client.js` and `./out/server.js`
  files the same way we do for a release so we're running the end-to-end VS
  Code integration tests against the same code we'll be releasing.
- Invokes `node ./out/test/src/runTest.js` to run the end-to-end tests.

[wasm-pack]: https://rustwasm.github.io/wasm-pack/installer/
