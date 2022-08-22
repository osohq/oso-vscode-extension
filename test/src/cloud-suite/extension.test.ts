import { ok, strictEqual } from 'assert';

import {
  Diagnostic,
  DiagnosticSeverity,
  languages,
  Position,
  Uri,
  workspace,
} from 'vscode';

// Helper that waits for `n` diagnostics to appear and then returns them.
async function getDiagnostics(n: number): Promise<[Uri, Diagnostic[]][]> {
  let diagnostics: [Uri, Diagnostic[]][] = [];
  for (;;) {
    diagnostics = languages.getDiagnostics();
    if (diagnostics.length === n) break;
    if (diagnostics.length > n)
      throw new Error(`too many diagnostics: ${diagnostics.toString()}`);
    await new Promise(r => setTimeout(r, 0));
  }
  return diagnostics;
}

suite('Diagnostics', () => {
  test('We receive a diagnostic for each Polar file in the workspace', async () => {
    const files = (await workspace.findFiles('*.polar'))
      .map(f => f.toString())
      .sort();
    const diagnostics = (await getDiagnostics(files.length)).sort();

    let [uri, [diagnostic]] = diagnostics[0];
    strictEqual(uri.toString(), files[0]);
    strictEqual(diagnostic.severity, DiagnosticSeverity.Error);
    strictEqual(diagnostic.code, 'ParseError::UnrecognizedToken');
    ok(diagnostic.range.start.isEqual(new Position(0, 5)));
    ok(diagnostic.range.end.isEqual(new Position(0, 8)));
    ok(
      diagnostic.message.startsWith(
        "Policy failed validation due to parser error: did not expect to find the token 'type'"
      )
    );

    [uri, [diagnostic]] = diagnostics[1];
    strictEqual(uri.toString(), files[1]);
    strictEqual(diagnostic.severity, DiagnosticSeverity.Error);
    strictEqual(diagnostic.code, 'ParseError::UnrecognizedEOF');
    ok(diagnostic.range.start.isEqual(new Position(0, 6)));
    ok(diagnostic.range.end.isEqual(new Position(0, 6)));
    ok(
      diagnostic.message.startsWith(
        'Policy failed validation due to parser error: hit the end of the file unexpectedly. Did you forget a semi-colon'
      )
    );
  });
});
