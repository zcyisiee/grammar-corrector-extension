/**
 * Diagnostics Provider for AI Grammar Corrector
 * Handles VS Code diagnostics, code actions, and hover providers
 */

import * as vscode from 'vscode';
import { CorrectionItem, DiagnosticData } from './types';
import { getUIMessage } from './prompts';

// Custom diagnostic severity for our extension
const DIAGNOSTIC_SOURCE = 'AI Grammar Corrector';

// Store correction data for each diagnostic
const diagnosticDataMap = new Map<string, Map<string, CorrectionItem>>();

/**
 * Create a unique key for a diagnostic
 */
function getDiagnosticKey(range: vscode.Range): string {
    return `${range.start.line}:${range.start.character}-${range.end.line}:${range.end.character}`;
}

/**
 * Create diagnostics from corrections
 */
export function createDiagnostics(
    document: vscode.TextDocument,
    corrections: CorrectionItem[],
    selectionOffset: number,
    diagnosticCollection: vscode.DiagnosticCollection,
    uiLanguage: string,
    enableSuggestions: boolean
): void {
    const diagnostics: vscode.Diagnostic[] = [];
    const documentUri = document.uri.toString();
    
    // Clear existing data for this document
    diagnosticDataMap.set(documentUri, new Map());
    const dataMap = diagnosticDataMap.get(documentUri)!;

    for (const correction of corrections) {
        // Skip suggestions if disabled
        if (correction.type === 'suggestion' && !enableSuggestions) {
            continue;
        }

        // Calculate the range in the document
        const startOffset = typeof correction.absoluteStart === 'number'
            ? correction.absoluteStart
            : selectionOffset + correction.startIndex;
        const endOffset = typeof correction.absoluteEnd === 'number'
            ? correction.absoluteEnd
            : selectionOffset + correction.endIndex;
        
        const startPos = document.positionAt(startOffset);
        const endPos = document.positionAt(endOffset);
        const range = new vscode.Range(startPos, endPos);

        // Create diagnostic
        const severity = correction.type === 'error' 
            ? vscode.DiagnosticSeverity.Error 
            : vscode.DiagnosticSeverity.Warning;

        const typeLabel = correction.type === 'error'
            ? getUIMessage('error', uiLanguage)
            : getUIMessage('suggestion', uiLanguage);

        const diagnostic = new vscode.Diagnostic(
            range,
            `[${typeLabel}] ${correction.explanation}`,
            severity
        );

        diagnostic.source = DIAGNOSTIC_SOURCE;
        diagnostic.code = correction.type;

        // Store correction data
        const key = getDiagnosticKey(range);
        dataMap.set(key, correction);

        diagnostics.push(diagnostic);
    }

    diagnosticCollection.set(document.uri, diagnostics);
}

/**
 * Get correction data for a diagnostic
 */
export function getCorrectionForRange(
    documentUri: string, 
    range: vscode.Range
): CorrectionItem | undefined {
    const dataMap = diagnosticDataMap.get(documentUri);
    if (!dataMap) return undefined;
    
    const key = getDiagnosticKey(range);
    return dataMap.get(key);
}

/**
 * Clear correction data for a document
 */
export function clearCorrectionData(documentUri: string): void {
    diagnosticDataMap.delete(documentUri);
}

/**
 * Code Action Provider for grammar corrections
 */
export class GrammarCodeActionProvider implements vscode.CodeActionProvider {
    private uiLanguage: string;
    private showExplanations: boolean;

    constructor(uiLanguage: string, showExplanations: boolean) {
        this.uiLanguage = uiLanguage;
        this.showExplanations = showExplanations;
    }

    public static readonly providedCodeActionKinds = [
        vscode.CodeActionKind.QuickFix
    ];

    provideCodeActions(
        document: vscode.TextDocument,
        range: vscode.Range | vscode.Selection,
        context: vscode.CodeActionContext,
        _token: vscode.CancellationToken
    ): vscode.CodeAction[] | undefined {
        const actions: vscode.CodeAction[] = [];

        for (const diagnostic of context.diagnostics) {
            if (diagnostic.source !== DIAGNOSTIC_SOURCE) {
                continue;
            }

            const correction = getCorrectionForRange(
                document.uri.toString(), 
                diagnostic.range
            );

            if (!correction) {
                continue;
            }

            // Create a quick fix for each suggestion
            for (let i = 0; i < correction.suggestions.length; i++) {
                const suggestion = correction.suggestions[i];
                const action = new vscode.CodeAction(
                    `${getUIMessage('accept', this.uiLanguage)}: "${suggestion}"`,
                    vscode.CodeActionKind.QuickFix
                );

                action.edit = new vscode.WorkspaceEdit();
                action.edit.replace(document.uri, diagnostic.range, suggestion);
                action.diagnostics = [diagnostic];
                action.isPreferred = i === 0; // First suggestion is preferred

                actions.push(action);
            }

            // Add reject action
            const rejectAction = new vscode.CodeAction(
                getUIMessage('reject', this.uiLanguage),
                vscode.CodeActionKind.QuickFix
            );
            rejectAction.diagnostics = [diagnostic];
            rejectAction.command = {
                command: 'aiGrammarCorrector.rejectCorrection',
                title: 'Reject Correction',
                arguments: [document.uri, diagnostic.range]
            };

            actions.push(rejectAction);
        }

        return actions;
    }
}

/**
 * Hover Provider for grammar corrections
 */
export class GrammarHoverProvider implements vscode.HoverProvider {
    private uiLanguage: string;
    private showExplanations: boolean;

    constructor(uiLanguage: string, showExplanations: boolean) {
        this.uiLanguage = uiLanguage;
        this.showExplanations = showExplanations;
    }

    provideHover(
        document: vscode.TextDocument,
        position: vscode.Position,
        _token: vscode.CancellationToken
    ): vscode.Hover | undefined {
        const documentUri = document.uri.toString();
        const dataMap = diagnosticDataMap.get(documentUri);
        
        if (!dataMap) {
            return undefined;
        }

        // Find a correction that contains this position
        for (const [key, correction] of dataMap) {
            const [startPart, endPart] = key.split('-');
            const [startLine, startChar] = startPart.split(':').map(Number);
            const [endLine, endChar] = endPart.split(':').map(Number);
            
            const range = new vscode.Range(
                new vscode.Position(startLine, startChar),
                new vscode.Position(endLine, endChar)
            );

            if (range.contains(position)) {
                return this.createHover(correction, range);
            }
        }

        return undefined;
    }

    private createHover(correction: CorrectionItem, range: vscode.Range): vscode.Hover {
        const markdown = new vscode.MarkdownString();
        markdown.isTrusted = true;
        markdown.supportHtml = true;

        // Header with type indicator
        const typeEmoji = correction.type === 'error' ? '🔴' : '🟡';
        const typeLabel = correction.type === 'error'
            ? getUIMessage('error', this.uiLanguage)
            : getUIMessage('suggestion', this.uiLanguage);

        markdown.appendMarkdown(`### ${typeEmoji} ${typeLabel}\n\n`);

        // Original text
        markdown.appendMarkdown(`**Original:** \`${correction.original}\`\n\n`);

        // Suggestions with colored indicators
        markdown.appendMarkdown(`**${getUIMessage('suggestion', this.uiLanguage)}:**\n\n`);
        
        for (let i = 0; i < correction.suggestions.length; i++) {
            const suggestion = correction.suggestions[i];
            const prefix = i === 0 ? '🟢' : '🟢';
            markdown.appendMarkdown(`${prefix} \`${suggestion}\`\n\n`);
        }

        // Explanation
        if (this.showExplanations && correction.explanation) {
            markdown.appendMarkdown(`---\n\n`);
            markdown.appendMarkdown(`**${getUIMessage('explanation', this.uiLanguage)}:** ${correction.explanation}\n\n`);
        }

        // Action hints
        markdown.appendMarkdown(`---\n\n`);
        markdown.appendMarkdown(`*💡 Click the lightbulb or press \`Ctrl+.\` to see quick fixes*`);

        return new vscode.Hover(markdown, range);
    }
}

/**
 * Decoration types for visual highlighting
 */
export const errorDecorationType = vscode.window.createTextEditorDecorationType({
    backgroundColor: 'rgba(255, 0, 0, 0.2)',
    border: '1px solid rgba(255, 0, 0, 0.5)',
    borderRadius: '2px'
});

export const suggestionDecorationType = vscode.window.createTextEditorDecorationType({
    backgroundColor: 'rgba(255, 255, 0, 0.2)',
    border: '1px solid rgba(255, 200, 0, 0.5)',
    borderRadius: '2px'
});

/**
 * Apply decorations to the editor
 */
export function applyDecorations(
    editor: vscode.TextEditor,
    corrections: CorrectionItem[],
    selectionOffset: number,
    enableSuggestions: boolean
): void {
    const document = editor.document;
    const errorDecorations: vscode.DecorationOptions[] = [];
    const suggestionDecorations: vscode.DecorationOptions[] = [];

    for (const correction of corrections) {
        // Skip suggestions if disabled
        if (correction.type === 'suggestion' && !enableSuggestions) {
            continue;
        }

        const startOffset = typeof correction.absoluteStart === 'number'
            ? correction.absoluteStart
            : selectionOffset + correction.startIndex;
        const endOffset = typeof correction.absoluteEnd === 'number'
            ? correction.absoluteEnd
            : selectionOffset + correction.endIndex;
        
        const startPos = document.positionAt(startOffset);
        const endPos = document.positionAt(endOffset);
        const range = new vscode.Range(startPos, endPos);

        const decoration: vscode.DecorationOptions = {
            range,
            hoverMessage: undefined // Hover is handled by HoverProvider
        };

        if (correction.type === 'error') {
            errorDecorations.push(decoration);
        } else {
            suggestionDecorations.push(decoration);
        }
    }

    editor.setDecorations(errorDecorationType, errorDecorations);
    editor.setDecorations(suggestionDecorationType, suggestionDecorations);
}

/**
 * Clear all decorations from an editor
 */
export function clearDecorations(editor: vscode.TextEditor): void {
    editor.setDecorations(errorDecorationType, []);
    editor.setDecorations(suggestionDecorationType, []);
}
