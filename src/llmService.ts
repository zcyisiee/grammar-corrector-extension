/**
 * LLM Service for AI Grammar Corrector
 * Handles communication with various LLM APIs
 */

import axios, { AxiosError } from 'axios';
import { 
    CorrectionResponse, 
    CorrectionItem, 
    LLMConfig, 
    LLMRequestBody, 
    LLMResponse 
} from './types';
import { getSystemPrompt, getUserPrompt } from './prompts';

export class LLMService {
    private config: LLMConfig;
    private targetLanguage: string;
    private uiLanguage: string;
    private customSystemPrompt: string;
    private customUserPrompt: string;

    constructor(
        config: LLMConfig,
        targetLanguage: string,
        uiLanguage: string,
        customSystemPrompt: string = '',
        customUserPrompt: string = ''
    ) {
        this.config = config;
        this.targetLanguage = targetLanguage;
        this.uiLanguage = uiLanguage;
        this.customSystemPrompt = customSystemPrompt;
        this.customUserPrompt = customUserPrompt;
    }

    /**
     * Check text for grammar errors and suggestions
     */
    async checkGrammar(text: string): Promise<CorrectionResponse> {
        if (!this.config.apiKey) {
            return {
                corrections: [],
                success: false,
                error: 'API key not configured'
            };
        }

        try {
            const systemPrompt = getSystemPrompt(
                this.targetLanguage, 
                this.uiLanguage, 
                this.customSystemPrompt
            );
            const userPrompt = getUserPrompt(text, this.customUserPrompt);

            const requestBody: LLMRequestBody = {
                model: this.config.model,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                max_tokens: this.config.maxTokens,
                temperature: this.config.temperature
            };

            // Add JSON response format for compatible models
            if (this.isJsonModeSupported()) {
                requestBody.response_format = { type: 'json_object' };
            }

            const response = await axios.post<LLMResponse>(
                this.config.apiUrl,
                requestBody,
                {
                    headers: {
                        'Authorization': `Bearer ${this.config.apiKey}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 60000 // 60 second timeout
                }
            );

            const content = response.data.choices[0]?.message?.content;
            if (!content) {
                return {
                    corrections: [],
                    success: false,
                    error: 'Empty response from API'
                };
            }

            return this.parseResponse(content, text);

        } catch (error) {
            return this.handleError(error);
        }
    }

    /**
     * Check if the model supports JSON response format
     */
    private isJsonModeSupported(): boolean {
        const jsonSupportedModels = [
            'gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-4-1106',
            'gpt-3.5-turbo-1106', 'gpt-3.5-turbo-0125'
        ];
        return jsonSupportedModels.some(m => this.config.model.includes(m));
    }

    /**
     * Parse the LLM response and extract corrections
     */
    private parseResponse(content: string, originalText: string): CorrectionResponse {
        try {
            // Try to extract JSON from the response
            let jsonContent = content;
            
            // Handle potential markdown code blocks
            const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
            if (jsonMatch) {
                jsonContent = jsonMatch[1].trim();
            }

            const parsed = JSON.parse(jsonContent);
            
            if (!parsed.corrections || !Array.isArray(parsed.corrections)) {
                return {
                    corrections: [],
                    success: true,
                    summary: parsed.summary || 'No corrections needed.'
                };
            }

            // Validate and enrich corrections with positions
            const corrections = this.validateAndEnrichCorrections(
                parsed.corrections, 
                originalText
            );

            return {
                corrections,
                summary: parsed.summary,
                success: true
            };

        } catch (parseError) {
            console.error('Failed to parse LLM response:', parseError);
            console.error('Raw content:', content);
            
            return {
                corrections: [],
                success: false,
                error: `Failed to parse response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`
            };
        }
    }

    /**
     * Validate corrections and calculate their positions in the original text
     */
    private validateAndEnrichCorrections(
        corrections: Partial<CorrectionItem>[], 
        originalText: string
    ): CorrectionItem[] {
        const validCorrections: CorrectionItem[] = [];
        const usedRanges: Array<{start: number; end: number}> = [];

        for (const correction of corrections) {
            if (!correction.original || !correction.suggestions?.length) {
                continue;
            }

            const suggestions = correction.suggestions ?? [];

            // Find the position of the original text
            let startIndex = -1;
            let matchedText = correction.original;
            let searchStart = 0;

            // Try to find a non-overlapping match
            while (true) {
                const index = originalText.indexOf(correction.original, searchStart);
                if (index === -1) {
                    break;
                }

                const endIndex = index + correction.original.length;
                const overlaps = usedRanges.some(
                    range => !(endIndex <= range.start || index >= range.end)
                );

                if (!overlaps) {
                    startIndex = index;
                    break;
                }

                searchStart = index + 1;
            }

            if (startIndex === -1) {
                // Try fuzzy matching for minor differences
                const fuzzyResult = this.fuzzyFindPosition(correction.original, originalText, usedRanges);
                if (fuzzyResult) {
                    startIndex = fuzzyResult.start;
                    matchedText = fuzzyResult.matchedText;
                }
            }

            if (startIndex !== -1) {
                const refined = this.refineRange(
                    matchedText,
                    suggestions,
                    startIndex
                );
                const finalStart = refined.startIndex;
                const finalEnd = refined.endIndex;
                const updatedSuggestions = refined.suggestions ?? suggestions;
                const currentText = originalText.slice(finalStart, finalEnd);

                // Skip if suggestion is identical to the current text
                if (!updatedSuggestions.some(s => s !== currentText)) {
                    continue;
                }

                // Reserve the range to avoid overlaps for next corrections
                usedRanges.push({ start: finalStart, end: finalEnd });

                validCorrections.push({
                    original: currentText,
                    suggestions: updatedSuggestions,
                    type: correction.type === 'suggestion' ? 'suggestion' : 'error',
                    explanation: correction.explanation || '',
                    startIndex: finalStart,
                    endIndex: finalEnd
                });
            }
        }

        return validCorrections;
    }

    /**
     * Fuzzy find a text position (handles minor whitespace differences)
     */
    private fuzzyFindPosition(
        searchText: string, 
        originalText: string,
        usedRanges: Array<{start: number; end: number}>
    ): { start: number; end: number; matchedText: string } | null {
        // Normalize whitespace for comparison
        const normalizedSearch = searchText.replace(/\s+/g, ' ').trim();
        
        // Sliding window search
        for (let i = 0; i <= originalText.length - normalizedSearch.length; i++) {
            const windowEnd = Math.min(i + normalizedSearch.length + 10, originalText.length);
            const window = originalText.slice(i, windowEnd);
            
            // Try different window sizes
            for (let len = normalizedSearch.length - 2; len <= normalizedSearch.length + 5; len++) {
                if (len > window.length) break;
                
                const candidate = window.slice(0, len);
                const normalizedCandidate = candidate.replace(/\s+/g, ' ').trim();
                
                if (normalizedCandidate === normalizedSearch) {
                    const endIndex = i + len;
                    const overlaps = usedRanges.some(
                        range => !(endIndex <= range.start || i >= range.end)
                    );
                    
                    if (!overlaps) {
                        return { start: i, end: endIndex, matchedText: candidate };
                    }
                }
            }
        }
        
        return null;
    }

    /**
     * Shrink the correction range to the minimal differing span between original and suggestion
     */
    private refineRange(
        matchedText: string,
        suggestions: string[],
        startIndex: number
    ): { startIndex: number; endIndex: number; suggestions: string[] } {
        if (!suggestions.length || matchedText === suggestions[0]) {
            return {
                startIndex,
                endIndex: startIndex + matchedText.length,
                suggestions
            };
        }

        const primary = suggestions[0];
        const prefixLen = this.commonPrefixLength(matchedText, primary);
        const suffixLen = this.commonSuffixLength(
            matchedText.slice(prefixLen),
            primary.slice(prefixLen)
        );

        const trimmedOriginal = matchedText.slice(
            prefixLen,
            matchedText.length - suffixLen
        );

        // If nothing left after trimming, keep the original span to avoid zero-length ranges
        if (trimmedOriginal.length === 0) {
            return {
                startIndex,
                endIndex: startIndex + matchedText.length,
                suggestions
            };
        }

        const refinedStart = startIndex + prefixLen;
        const refinedEnd = refinedStart + trimmedOriginal.length;

        const refinedSuggestions = suggestions.map(suggestion => {
            if (suggestion.length < prefixLen + suffixLen) {
                return suggestion;
            }

            const inner = suggestion.slice(
                prefixLen,
                suggestion.length - suffixLen
            );

            return inner.length > 0 ? inner : suggestion;
        });

        return {
            startIndex: refinedStart,
            endIndex: refinedEnd,
            suggestions: refinedSuggestions
        };
    }

    private commonPrefixLength(a: string, b: string): number {
        const max = Math.min(a.length, b.length);
        let i = 0;
        while (i < max && a[i] === b[i]) {
            i++;
        }
        return i;
    }

    private commonSuffixLength(a: string, b: string): number {
        const max = Math.min(a.length, b.length);
        let i = 0;
        while (i < max && a[a.length - 1 - i] === b[b.length - 1 - i]) {
            i++;
        }
        return i;
    }

    /**
     * Handle API errors
     */
    private handleError(error: unknown): CorrectionResponse {
        if (axios.isAxiosError(error)) {
            const axiosError = error as AxiosError<{error?: {message?: string}}>;
            
            if (axiosError.response) {
                const status = axiosError.response.status;
                const message = axiosError.response.data?.error?.message || axiosError.message;
                
                if (status === 401) {
                    return {
                        corrections: [],
                        success: false,
                        error: 'Invalid API key. Please check your configuration.'
                    };
                } else if (status === 429) {
                    return {
                        corrections: [],
                        success: false,
                        error: 'Rate limit exceeded. Please try again later.'
                    };
                } else if (status === 500 || status === 502 || status === 503) {
                    return {
                        corrections: [],
                        success: false,
                        error: 'API service temporarily unavailable. Please try again.'
                    };
                }
                
                return {
                    corrections: [],
                    success: false,
                    error: `API Error (${status}): ${message}`
                };
            } else if (axiosError.code === 'ECONNABORTED') {
                return {
                    corrections: [],
                    success: false,
                    error: 'Request timeout. The text might be too long.'
                };
            }
        }

        return {
            corrections: [],
            success: false,
            error: `Unknown error: ${error instanceof Error ? error.message : 'Unknown'}`
        };
    }
}
