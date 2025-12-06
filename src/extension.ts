/**
 * AI Grammar Corrector - VS Code Extension
 * Main entry point for the extension
 */

import * as vscode from 'vscode';
import { LLMService } from './llmService';
import { ExtensionConfig, CorrectionItem } from './types';
import { getUIMessage } from './prompts';
import {
    createDiagnostics,
    clearCorrectionData,
    GrammarCodeActionProvider,
    GrammarHoverProvider,
    applyDecorations,
    clearDecorations,
    errorDecorationType,
    suggestionDecorationType
} from './diagnosticsProvider';

interface CorrectionContext {
    corrections: CorrectionItem[];
    selectionOffset: number;
}

// Global state
let diagnosticCollection: vscode.DiagnosticCollection;
let statusBarItem: vscode.StatusBarItem;
let currentCorrections: Map<string, CorrectionContext> = new Map();
let hoverProviderRegistration: vscode.Disposable | undefined;
let codeActionProviderRegistration: vscode.Disposable | undefined;

/**
 * Get extension configuration
 */
function getConfig(): ExtensionConfig {
    const config = vscode.workspace.getConfiguration('aiGrammarCorrector');
    
    // Support flexible naming for model/apiUrl so users can set model_name/url aliases
    const modelName = config.get<string>('modelName') || config.get<string>('model_name');
    const resolvedModel = modelName || config.get<string>('model') || 'gpt-4o-mini';

    const apiUrlSetting = config.get<string>('apiUrl');
    const apiUrlAlias = config.get<string>('url');
    const resolvedApiUrl = (apiUrlSetting && apiUrlSetting.trim())
        || (apiUrlAlias && apiUrlAlias.trim())
        || 'https://api.openai.com/v1/chat/completions';

    return {
        apiUrl: resolvedApiUrl,
        apiKey: config.get('apiKey', ''),
        model: resolvedModel,
        maxTokens: config.get('maxTokens', 2000),
        temperature: config.get('temperature', 0.3),
        targetLanguage: config.get('targetLanguage', 'English'),
        uiLanguage: config.get('uiLanguage', 'English'),
        customSystemPrompt: config.get('customSystemPrompt', ''),
        customUserPrompt: config.get('customUserPrompt', ''),
        showExplanations: config.get('showExplanations', true),
        enableSuggestions: config.get('enableSuggestions', true)
    };
}

/**
 * Register hover/code action providers using the latest configuration
 */
function registerProviders(context: vscode.ExtensionContext, config: ExtensionConfig): void {
    hoverProviderRegistration?.dispose();
    codeActionProviderRegistration?.dispose();

    codeActionProviderRegistration = vscode.languages.registerCodeActionsProvider(
        [
            { language: 'markdown', scheme: 'file' },
            { language: 'latex', scheme: 'file' },
            { language: 'tex', scheme: 'file' }
        ],
        new GrammarCodeActionProvider(config.uiLanguage, config.showExplanations),
        {
            providedCodeActionKinds: GrammarCodeActionProvider.providedCodeActionKinds
        }
    );

    hoverProviderRegistration = vscode.languages.registerHoverProvider(
        [
            { language: 'markdown', scheme: 'file' },
            { language: 'latex', scheme: 'file' },
            { language: 'tex', scheme: 'file' }
        ],
        new GrammarHoverProvider(config.uiLanguage, config.showExplanations)
    );

    context.subscriptions.push(codeActionProviderRegistration, hoverProviderRegistration);
}

/**
 * Quick helper to open extension settings
 */
async function openExtensionSettings(): Promise<void> {
    await vscode.commands.executeCommand(
        'workbench.action.openSettings', 
        'aiGrammarCorrector'
    );
}

/**
 * Show status message
 */
function showStatus(message: string, duration: number = 3000): void {
    statusBarItem.text = `$(pencil) ${message}`;
    statusBarItem.show();
    
    if (duration > 0) {
        setTimeout(() => {
            statusBarItem.hide();
        }, duration);
    }
}

/**
 * Check selected text for grammar issues
 */
async function checkSelection(): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showWarningMessage('No active editor');
        return;
    }

    const config = getConfig();
    const selection = editor.selection;
    
    if (selection.isEmpty) {
        vscode.window.showWarningMessage(getUIMessage('noSelection', config.uiLanguage));
        return;
    }

    if (!config.apiKey) {
        const action = await vscode.window.showErrorMessage(
            getUIMessage('noApiKey', config.uiLanguage),
            'Open Settings'
        );
        if (action === 'Open Settings') {
            vscode.commands.executeCommand(
                'workbench.action.openSettings', 
                'aiGrammarCorrector.apiKey'
            );
        }
        return;
    }

    const selectedText = editor.document.getText(selection);
    const selectionOffset = editor.document.offsetAt(selection.start);
    
    // Show progress
    showStatus(getUIMessage('checking', config.uiLanguage), 0);

    try {
        const llmService = new LLMService(
            {
                apiUrl: config.apiUrl,
                apiKey: config.apiKey,
                model: config.model,
                maxTokens: config.maxTokens,
                temperature: config.temperature
            },
            config.targetLanguage,
            config.uiLanguage,
            config.customSystemPrompt,
            config.customUserPrompt
        );

        const result = await llmService.checkGrammar(selectedText);

        if (!result.success) {
            statusBarItem.hide();
            vscode.window.showErrorMessage(
                `${getUIMessage('apiError', config.uiLanguage)}: ${result.error}`
            );
            return;
        }

        if (result.corrections.length === 0) {
            statusBarItem.hide();
            vscode.window.showInformationMessage(
                getUIMessage('noErrors', config.uiLanguage)
            );
            return;
        }

        // Enrich corrections with absolute positions
        const enrichedCorrections = result.corrections.map(correction => ({
            ...correction,
            absoluteStart: selectionOffset + correction.startIndex,
            absoluteEnd: selectionOffset + correction.endIndex
        }));

        // Store corrections
        const documentUri = editor.document.uri.toString();
        currentCorrections.set(documentUri, {
            corrections: enrichedCorrections,
            selectionOffset
        });

        // Create diagnostics
        createDiagnostics(
            editor.document,
            enrichedCorrections,
            selectionOffset,
            diagnosticCollection,
            config.uiLanguage,
            config.enableSuggestions
        );

        // Apply decorations
        applyDecorations(
            editor,
            enrichedCorrections,
            selectionOffset,
            config.enableSuggestions
        );

        // Show summary
        const errorCount = result.corrections.filter(c => c.type === 'error').length;
        const suggestionCount = result.corrections.filter(c => c.type === 'suggestion').length;
        
        let summaryMessage = getUIMessage('errorFound', config.uiLanguage);
        summaryMessage += `: ${errorCount} ${getUIMessage('error', config.uiLanguage).toLowerCase()}`;
        if (config.enableSuggestions && suggestionCount > 0) {
            summaryMessage += `, ${suggestionCount} ${getUIMessage('suggestion', config.uiLanguage).toLowerCase()}`;
        }

        showStatus(summaryMessage, 5000);

        // Show notification with summary
        if (result.summary) {
            vscode.window.showInformationMessage(result.summary);
        }

    } catch (error) {
        statusBarItem.hide();
        vscode.window.showErrorMessage(
            `${getUIMessage('apiError', config.uiLanguage)}: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
    }
}

/**
 * Check entire document for grammar issues
 */
async function checkDocument(): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showWarningMessage('No active editor');
        return;
    }

    // Select all text
    const document = editor.document;
    const fullRange = new vscode.Range(
        document.positionAt(0),
        document.positionAt(document.getText().length)
    );

    editor.selection = new vscode.Selection(fullRange.start, fullRange.end);
    
    // Run check
    await checkSelection();
}

/**
 * Clear all diagnostics
 */
function clearDiagnostics(): void {
    const editor = vscode.window.activeTextEditor;
    
    diagnosticCollection.clear();
    currentCorrections.clear();
    
    if (editor) {
        clearDecorations(editor);
        clearCorrectionData(editor.document.uri.toString());
    }

    const config = getConfig();
    vscode.window.showInformationMessage(
        config.uiLanguage === 'Chinese' ? '已清除所有诊断' : 'All diagnostics cleared'
    );
}

/**
 * Reject a correction (remove diagnostic without applying)
 */
function rejectCorrection(uri: vscode.Uri, range: vscode.Range): void {
    const document = vscode.workspace.textDocuments.find(
        doc => doc.uri.toString() === uri.toString()
    );
    const context = currentCorrections.get(uri.toString());

    if (!document || !context) {
        return;
    }

    const filteredCorrections = context.corrections.filter(correction => {
        const startPos = document.positionAt(
            correction.absoluteStart ?? context.selectionOffset + correction.startIndex
        );
        const endPos = document.positionAt(
            correction.absoluteEnd ?? context.selectionOffset + correction.endIndex
        );
        const correctionRange = new vscode.Range(startPos, endPos);
        return !correctionRange.isEqual(range);
    });

    if (filteredCorrections.length === 0) {
        diagnosticCollection.delete(uri);
        clearCorrectionData(uri.toString());
        currentCorrections.delete(uri.toString());

        const editor = vscode.window.activeTextEditor;
        if (editor && editor.document.uri.toString() === uri.toString()) {
            clearDecorations(editor);
        }
        return;
    }

    const config = getConfig();
    createDiagnostics(
        document,
        filteredCorrections,
        context.selectionOffset,
        diagnosticCollection,
        config.uiLanguage,
        config.enableSuggestions
    );

    const editor = vscode.window.activeTextEditor;
    if (editor && editor.document.uri.toString() === uri.toString()) {
        applyDecorations(
            editor,
            filteredCorrections,
            context.selectionOffset,
            config.enableSuggestions
        );
    }

    currentCorrections.set(uri.toString(), {
        corrections: filteredCorrections,
        selectionOffset: context.selectionOffset
    });
}

/**
 * Extension activation
 */
export function activate(context: vscode.ExtensionContext): void {
    console.log('AI Grammar Corrector is now active');

    // Create diagnostic collection
    diagnosticCollection = vscode.languages.createDiagnosticCollection('aiGrammar');
    context.subscriptions.push(diagnosticCollection);

    // Create status bar item
    statusBarItem = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Left,
        100
    );
    context.subscriptions.push(statusBarItem);

    // Get initial config for providers
    const config = getConfig();
    registerProviders(context, config);

    // Register commands
    context.subscriptions.push(
        vscode.commands.registerCommand(
            'aiGrammarCorrector.checkSelection',
            checkSelection
        )
    );

    context.subscriptions.push(
        vscode.commands.registerCommand(
            'aiGrammarCorrector.checkDocument',
            checkDocument
        )
    );

    context.subscriptions.push(
        vscode.commands.registerCommand(
            'aiGrammarCorrector.clearDiagnostics',
            clearDiagnostics
        )
    );

    context.subscriptions.push(
        vscode.commands.registerCommand(
            'aiGrammarCorrector.rejectCorrection',
            rejectCorrection
        )
    );
    context.subscriptions.push(
        vscode.commands.registerCommand(
            'aiGrammarCorrector.openSettings',
            openExtensionSettings
        )
    );

    // Listen for document changes to clear stale diagnostics
    context.subscriptions.push(
        vscode.workspace.onDidChangeTextDocument(event => {
            const documentUri = event.document.uri.toString();
            const context = currentCorrections.get(documentUri);
            if (!context) {
                return;
            }

            let corrections = context.corrections;
            let selectionOffset = context.selectionOffset;
            let hasChanges = false;

            for (const change of event.contentChanges) {
                const changeStart = typeof change.rangeOffset === 'number'
                    ? change.rangeOffset
                    : event.document.offsetAt(change.range.start);
                const changeEnd = changeStart + change.rangeLength;
                const delta = change.text.length - change.rangeLength;

                const updatedCorrections: CorrectionItem[] = [];

                for (const correction of corrections) {
                    const absoluteStart = correction.absoluteStart ?? selectionOffset + correction.startIndex;
                    const absoluteEnd = correction.absoluteEnd ?? selectionOffset + correction.endIndex;

                    // If the change overlaps this correction, drop it
                    if (!(changeEnd <= absoluteStart || changeStart >= absoluteEnd)) {
                        hasChanges = true;
                        continue;
                    }

                    // Shift corrections that appear after the change
                    if (absoluteStart >= changeEnd && delta !== 0) {
                        const shiftedStart = absoluteStart + delta;
                        const shiftedEnd = absoluteEnd + delta;
                        updatedCorrections.push({
                            ...correction,
                            absoluteStart: shiftedStart,
                            absoluteEnd: shiftedEnd,
                            startIndex: correction.startIndex + delta,
                            endIndex: correction.endIndex + delta
                        });
                        hasChanges = true;
                    } else {
                        updatedCorrections.push(correction);
                    }
                }

                corrections = updatedCorrections;

                // Keep track of selection offset so future calculations stay aligned
                if (changeStart < selectionOffset) {
                    selectionOffset = Math.max(selectionOffset + delta, 0);
                    hasChanges = true;
                }
            }

            if (!hasChanges) {
                return;
            }

            if (corrections.length === 0) {
                diagnosticCollection.delete(event.document.uri);
                currentCorrections.delete(documentUri);
                clearCorrectionData(documentUri);
                
                const editor = vscode.window.activeTextEditor;
                if (editor && editor.document.uri.toString() === documentUri) {
                    clearDecorations(editor);
                }
                return;
            }

            const config = getConfig();
            currentCorrections.set(documentUri, { corrections, selectionOffset });

            createDiagnostics(
                event.document,
                corrections,
                selectionOffset,
                diagnosticCollection,
                config.uiLanguage,
                config.enableSuggestions
            );

            const editor = vscode.window.activeTextEditor;
            if (editor && editor.document.uri.toString() === documentUri) {
                applyDecorations(
                    editor,
                    corrections,
                    selectionOffset,
                    config.enableSuggestions
                );
            }
        })
    );

    // Listen for editor changes to refresh decorations
    context.subscriptions.push(
        vscode.window.onDidChangeActiveTextEditor(editor => {
            if (editor) {
                const documentUri = editor.document.uri.toString();
                const context = currentCorrections.get(documentUri);
                if (context) {
                    const config = getConfig();
                    applyDecorations(
                        editor,
                        context.corrections,
                        context.selectionOffset,
                        config.enableSuggestions
                    );
                }
            }
        })
    );

    // Listen for configuration changes
    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration(event => {
            if (event.affectsConfiguration('aiGrammarCorrector')) {
                console.log('AI Grammar Corrector configuration changed');
                const updatedConfig = getConfig();
                registerProviders(context, updatedConfig);
            }
        })
    );
}

/**
 * Extension deactivation
 */
export function deactivate(): void {
    diagnosticCollection?.dispose();
    statusBarItem?.dispose();
    hoverProviderRegistration?.dispose();
    codeActionProviderRegistration?.dispose();
    errorDecorationType?.dispose();
    suggestionDecorationType?.dispose();
}
