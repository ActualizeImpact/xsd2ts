import ts from "typescript";
import * as path from "path";
import { expect } from "vitest";

interface CompileResult {
  success: boolean;
  diagnostics: ts.Diagnostic[];
  emitResult?: ts.EmitResult;
}

export function compile(filePath: string): CompileResult {
  // Ensure file exists
  expect(path.isAbsolute(filePath) || filePath.startsWith("./")).toBeTruthy();

  // Create compiler options
  const compilerOptions: ts.CompilerOptions = {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ESNext,
    strict: true,
    esModuleInterop: true,
    skipLibCheck: true,
    forceConsistentCasingInFileNames: true,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    noEmitOnError: true,
    declaration: true,
  };

  // Create program
  const program = ts.createProgram([filePath], compilerOptions);

  // Get pre-emit diagnostics
  const preEmitDiagnostics = ts.getPreEmitDiagnostics(program);

  // Emit
  const emitResult = program.emit();

  // Get all diagnostics
  const allDiagnostics = ts
    .getPreEmitDiagnostics(program)
    .concat(emitResult.diagnostics);

  // Format diagnostics if any exist
  if (allDiagnostics.length > 0) {
    allDiagnostics.forEach((diagnostic) => {
      if (diagnostic.file) {
        const { line, character } = ts.getLineAndCharacterOfPosition(
          diagnostic.file,
          diagnostic.start!
        );
        const message = ts.flattenDiagnosticMessageText(
          diagnostic.messageText,
          "\n"
        );
        console.error(
          `${diagnostic.file.fileName} (${line + 1},${character + 1}): ${message}`
        );
      } else {
        console.error(
          ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n")
        );
      }
    });
  }

  return {
    success: !emitResult.emitSkipped && preEmitDiagnostics.length === 0,
    diagnostics: allDiagnostics,
    emitResult,
  };
}

// Helper function to check if compilation was successful
export async function assertSuccessfulCompilation(
  filePath: string
): Promise<void> {
  const result = compile(filePath);
  expect(result.success, formatCompilationErrors(result.diagnostics)).toBe(
    true
  );
}

// Helper function to format compilation errors
function formatCompilationErrors(diagnostics: ts.Diagnostic[]): string {
  if (diagnostics.length === 0) return "";

  return diagnostics
    .map((diagnostic) => {
      if (diagnostic.file) {
        const { line, character } = ts.getLineAndCharacterOfPosition(
          diagnostic.file,
          diagnostic.start!
        );
        const message = ts.flattenDiagnosticMessageText(
          diagnostic.messageText,
          "\n"
        );
        return `${diagnostic.file.fileName} (${line + 1},${character + 1}): ${message}`;
      }
      return ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");
    })
    .join("\n");
}
