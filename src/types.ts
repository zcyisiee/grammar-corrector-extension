/**
 * Types and interfaces for AI Grammar Corrector
 */

export interface CorrectionItem {
    /** Original text with error */
    original: string;
    /** Suggested corrections (can be multiple) */
    suggestions: string[];
    /** Type: 'error' for grammar/spelling, 'suggestion' for style improvements */
    type: 'error' | 'suggestion';
    /** Explanation of why this correction is suggested */
    explanation: string;
    /** Start position in the original text */
    startIndex: number;
    /** End position in the original text */
    endIndex: number;
}

export interface CorrectionResponse {
    /** Array of corrections found */
    corrections: CorrectionItem[];
    /** Overall assessment of the text */
    summary?: string;
    /** Whether the API call was successful */
    success: boolean;
    /** Error message if any */
    error?: string;
}

export interface LLMConfig {
    apiUrl: string;
    apiKey: string;
    model: string;
    maxTokens: number;
    temperature: number;
}

export interface ExtensionConfig extends LLMConfig {
    targetLanguage: string;
    uiLanguage: string;
    customSystemPrompt: string;
    customUserPrompt: string;
    showExplanations: boolean;
    enableSuggestions: boolean;
}

export interface DiagnosticData {
    corrections: CorrectionItem;
    documentUri: string;
}

export interface LLMMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export interface LLMRequestBody {
    model: string;
    messages: LLMMessage[];
    max_tokens: number;
    temperature: number;
    response_format?: {
        type: string;
    };
}

export interface LLMResponseChoice {
    message: {
        content: string;
    };
}

export interface LLMResponse {
    choices: LLMResponseChoice[];
}
