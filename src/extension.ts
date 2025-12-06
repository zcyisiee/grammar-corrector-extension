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

// Global state
let diagnosticCollection: vscode.DiagnosticCollection;
let statusBarItem: vscode.StatusBarItem;
let currentCorrections: Map<string, CorrectionItem[]> = new Map();
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

        // Store corrections
        const documentUri = editor.document.uri.toString();
        currentCorrections.set(documentUri, result.corrections);

        // Create diagnostics
        createDiagnostics(
            editor.document,
            result.corrections,
            selection.start,
            diagnosticCollection,
            config.uiLanguage,
            config.enableSuggestions
        );

        // Apply decorations
        applyDecorations(
            editor,
            result.corrections,
            selection.start,
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
    const diagnostics = diagnosticCollection.get(uri);
    if (!diagnostics) return;

    const newDiagnostics = diagnostics.filter(d => !d.range.isEqual(range));
    diagnosticCollection.set(uri, newDiagnostics);

    // Update decorations
    const editor = vscode.window.activeTextEditor;
    if (editor && editor.document.uri.toString() === uri.toString()) {
        const corrections = currentCorrections.get(uri.toString());
        if (corrections) {
            // Remove the rejected correction
            const updatedCorrections = corrections.filter(c => {
                const startOffset = editor.document.offsetAt(range.start);
                const correctionStart = c.startIndex;
                return startOffset !== correctionStart;
            });
            currentCorrections.set(uri.toString(), updatedCorrections);
        }
    }
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
            if (currentCorrections.has(documentUri)) {
                // Clear diagnostics when document changes
                diagnosticCollection.delete(event.document.uri);
                currentCorrections.delete(documentUri);
                clearCorrectionData(documentUri);
                
                const editor = vscode.window.activeTextEditor;
                if (editor && editor.document.uri.toString() === documentUri) {
                    clearDecorations(editor);
                }
            }
        })
    );

    // Listen for editor changes to refresh decorations
    context.subscriptions.push(
        vscode.window.onDidChangeActiveTextEditor(editor => {
            if (editor) {
                const documentUri = editor.document.uri.toString();
                const corrections = currentCorrections.get(documentUri);
                if (corrections) {
                    // Re-apply decorations for this editor
                    // Note: This is a simplified approach
                    // In practice, we'd need to track the original selection
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
