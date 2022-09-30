import {
  CodeActionKind,
  CodeActionParams,
  Command,
  createConnection,
  Diagnostic,
  Position,
  ProposedFeatures,
  PublishDiagnosticsParams,
  Range,
  TextDocumentSyncKind,
} from 'vscode-languageserver/node';
import { PolarLanguageServer } from '../../out/polar_language_server'; // eslint-disable-line node/no-unpublished-import
import { PolarCloudLanguageServer } from '../../out/polar_cloud_language_server'; // eslint-disable-line node/no-unpublished-import
import { DocumentUri } from 'vscode-languageclient';

// Create LSP connection
const connection = createConnection(ProposedFeatures.all);

const currentDiagnostics = new Map<DocumentUri, Diagnostic[]>();

const sendDiagnosticsCallback = (params: PublishDiagnosticsParams) => {
  currentDiagnostics.set(params.uri, params.diagnostics);
  connection.sendDiagnostics(params);
};
const telemetryCallback = (event: unknown) =>
  connection.telemetry.logEvent(event);

let LanguageServer;
let switchValidationsCommand: Command;
switch (process.argv[2]) {
  case 'library':
    LanguageServer = PolarLanguageServer;
    switchValidationsCommand = {
      title:
        'Validate Polar policies for Oso Cloud rather than for Oso Library',
      command: 'oso.useCloudValidation',
    };
    break;
  case 'cloud':
    LanguageServer = PolarCloudLanguageServer;
    switchValidationsCommand = {
      title:
        'Validate Polar policies for Oso Library rather than for Oso Cloud',
      command: 'oso.useLibraryValidation',
    };
    break;
  default:
    throw 'expected language to be library or cloud';
}

const pls = new LanguageServer(sendDiagnosticsCallback, telemetryCallback);

function positionIsBeforeOrEqual(before: Position, after: Position): boolean {
  if (before.line === after.line) {
    return before.character <= after.character;
  } else {
    return before.line < after.line;
  }
}

function rangeOverlaps(outer: Range, inner: Range): boolean {
  return (
    positionIsBeforeOrEqual(outer.start, inner.start) &&
    positionIsBeforeOrEqual(inner.end, outer.end)
  );
}

connection.onCodeAction((params: CodeActionParams) => {
  return (
    currentDiagnostics
      .get(params.textDocument.uri)
      ?.filter(diagnostic => rangeOverlaps(diagnostic.range, params.range))
      .map(diagnostic => ({
        title: switchValidationsCommand.title,
        kind: CodeActionKind.QuickFix,
        diagnostics: [diagnostic],
        command: switchValidationsCommand,
      })) || []
  );
});

connection.onNotification((...args) => pls.onNotification(...args));

connection.onInitialize(() => {
  return {
    capabilities: {
      codeActionProvider: {
        codeActionKinds: [CodeActionKind.QuickFix],
      },
      textDocumentSync: {
        openClose: true,
        // NOTE(gj): we should set this to `{ includeText: true }` if we care
        // about `didSave` events in the future. For now, we don't care about
        // them b/c we already have the updated state thanks to `didChange`.
        save: false,
        change: TextDocumentSyncKind.Full,
      },
      workspace: {
        workspaceFolders: { supported: true },
        // NOTE(gj): There's [an open issue][1] when specifying the `matches`
        // property of a `FileOperationFilter` provided for
        // `fileOperations.didDelete.filters`. The resultant behavior is that
        // (A) the filter doesn't actually filter events by the `matches`
        // clause and (B) spurious errors are shown in the PLS output channel
        // and, more alarmingly, surfaced to users via a toast.
        //
        // [1]: https://github.com/microsoft/vscode-languageserver-node/issues/734
        //
        // I thought we might be able to listen for `willDelete` since it
        // shouldn't suffer from the same limitation, but for some reason
        // `willDelete` isn't firing when I delete directories or files via the
        // VS Code interface.
        //
        // Once [the associated PR][2] ships, we should be able to update the
        // version of `vscode-languageserver` we depend on and then uncomment
        // the `matches: 'folder',` clause below.
        //
        // [2]: https://github.com/microsoft/vscode-languageserver-node/pull/744
        fileOperations: {
          didDelete: {
            filters: [{ pattern: { /* matches: 'folder', */ glob: '**' } }],
          },
        },
      },
    },
  };
});

connection.listen();
