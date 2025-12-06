/**
 * Prompt templates for AI Grammar Corrector
 * These prompts are designed to work with various LLM APIs
 */

export const LANGUAGE_INSTRUCTIONS: Record<string, string> = {
    'English': 'Respond entirely in English.',
    'Chinese': '请完全使用中文回复。',
    'Spanish': 'Responda completamente en español.',
    'French': 'Répondez entièrement en français.',
    'German': 'Antworten Sie vollständig auf Deutsch.',
    'Japanese': '完全に日本語で回答してください。',
    'Korean': '완전히 한국어로 답변해 주세요.',
    'Portuguese': 'Responda inteiramente em português.',
    'Russian': 'Отвечайте полностью на русском языке.',
    'Italian': 'Rispondi interamente in italiano.',
    'Auto-detect': 'Respond in the same language as the input text.'
};

export const UI_MESSAGES: Record<string, Record<string, string>> = {
    'English': {
        checking: 'Checking grammar...',
        noErrors: 'No grammar errors found!',
        errorFound: 'Grammar issues found',
        apiError: 'API Error',
        configError: 'Configuration Error',
        noApiKey: 'Please set your API key in settings',
        noSelection: 'Please select some text first',
        accept: 'Accept',
        reject: 'Reject',
        acceptAll: 'Accept All',
        error: 'Error',
        suggestion: 'Suggestion',
        explanation: 'Explanation'
    },
    'Chinese': {
        checking: '正在检查语法...',
        noErrors: '未发现语法错误！',
        errorFound: '发现语法问题',
        apiError: 'API 错误',
        configError: '配置错误',
        noApiKey: '请在设置中配置您的 API 密钥',
        noSelection: '请先选择一些文本',
        accept: '接受',
        reject: '拒绝',
        acceptAll: '全部接受',
        error: '错误',
        suggestion: '建议',
        explanation: '说明'
    },
    'Spanish': {
        checking: 'Comprobando gramática...',
        noErrors: '¡No se encontraron errores gramaticales!',
        errorFound: 'Se encontraron problemas gramaticales',
        apiError: 'Error de API',
        configError: 'Error de configuración',
        noApiKey: 'Por favor, configure su clave API en los ajustes',
        noSelection: 'Por favor, seleccione algún texto primero',
        accept: 'Aceptar',
        reject: 'Rechazar',
        acceptAll: 'Aceptar todo',
        error: 'Error',
        suggestion: 'Sugerencia',
        explanation: 'Explicación'
    },
    'French': {
        checking: 'Vérification de la grammaire...',
        noErrors: 'Aucune erreur grammaticale trouvée!',
        errorFound: 'Problèmes grammaticaux trouvés',
        apiError: 'Erreur API',
        configError: 'Erreur de configuration',
        noApiKey: 'Veuillez configurer votre clé API dans les paramètres',
        noSelection: 'Veuillez d\'abord sélectionner du texte',
        accept: 'Accepter',
        reject: 'Rejeter',
        acceptAll: 'Tout accepter',
        error: 'Erreur',
        suggestion: 'Suggestion',
        explanation: 'Explication'
    },
    'German': {
        checking: 'Grammatik wird überprüft...',
        noErrors: 'Keine Grammatikfehler gefunden!',
        errorFound: 'Grammatikprobleme gefunden',
        apiError: 'API-Fehler',
        configError: 'Konfigurationsfehler',
        noApiKey: 'Bitte setzen Sie Ihren API-Schlüssel in den Einstellungen',
        noSelection: 'Bitte wählen Sie zuerst einen Text aus',
        accept: 'Akzeptieren',
        reject: 'Ablehnen',
        acceptAll: 'Alle akzeptieren',
        error: 'Fehler',
        suggestion: 'Vorschlag',
        explanation: 'Erklärung'
    },
    'Japanese': {
        checking: '文法をチェック中...',
        noErrors: '文法エラーは見つかりませんでした！',
        errorFound: '文法の問題が見つかりました',
        apiError: 'APIエラー',
        configError: '設定エラー',
        noApiKey: '設定でAPIキーを設定してください',
        noSelection: '最初にテキストを選択してください',
        accept: '承認',
        reject: '拒否',
        acceptAll: 'すべて承認',
        error: 'エラー',
        suggestion: '提案',
        explanation: '説明'
    },
    'Korean': {
        checking: '문법 검사 중...',
        noErrors: '문법 오류를 찾지 못했습니다!',
        errorFound: '문법 문제가 발견되었습니다',
        apiError: 'API 오류',
        configError: '설정 오류',
        noApiKey: '설정에서 API 키를 설정하세요',
        noSelection: '먼저 텍스트를 선택하세요',
        accept: '수락',
        reject: '거부',
        acceptAll: '모두 수락',
        error: '오류',
        suggestion: '제안',
        explanation: '설명'
    },
    'Portuguese': {
        checking: 'Verificando gramática...',
        noErrors: 'Nenhum erro gramatical encontrado!',
        errorFound: 'Problemas gramaticais encontrados',
        apiError: 'Erro de API',
        configError: 'Erro de configuração',
        noApiKey: 'Por favor, configure sua chave API nas configurações',
        noSelection: 'Por favor, selecione algum texto primeiro',
        accept: 'Aceitar',
        reject: 'Rejeitar',
        acceptAll: 'Aceitar tudo',
        error: 'Erro',
        suggestion: 'Sugestão',
        explanation: 'Explicação'
    },
    'Russian': {
        checking: 'Проверка грамматики...',
        noErrors: 'Грамматических ошибок не найдено!',
        errorFound: 'Обнаружены грамматические проблемы',
        apiError: 'Ошибка API',
        configError: 'Ошибка конфигурации',
        noApiKey: 'Пожалуйста, установите API ключ в настройках',
        noSelection: 'Пожалуйста, сначала выберите текст',
        accept: 'Принять',
        reject: 'Отклонить',
        acceptAll: 'Принять все',
        error: 'Ошибка',
        suggestion: 'Предложение',
        explanation: 'Объяснение'
    },
    'Italian': {
        checking: 'Controllo grammatica...',
        noErrors: 'Nessun errore grammaticale trovato!',
        errorFound: 'Problemi grammaticali trovati',
        apiError: 'Errore API',
        configError: 'Errore di configurazione',
        noApiKey: 'Si prega di impostare la chiave API nelle impostazioni',
        noSelection: 'Si prega di selezionare prima del testo',
        accept: 'Accetta',
        reject: 'Rifiuta',
        acceptAll: 'Accetta tutto',
        error: 'Errore',
        suggestion: 'Suggerimento',
        explanation: 'Spiegazione'
    }
};

/**
 * Generate the system prompt for grammar checking
 */
export function getSystemPrompt(targetLanguage: string, uiLanguage: string, customPrompt: string): string {
    const languageInstruction = LANGUAGE_INSTRUCTIONS[uiLanguage] || LANGUAGE_INSTRUCTIONS['English'];
    
    const basePrompt = `You are an expert proofreader and grammar checker. Focus on grammar and spelling only. Ignore minor formatting, whitespace, or stylistic preferences unless they clearly affect correctness or readability.

${languageInstruction}

## Your Task
Identify issues in the provided text:
1. **Grammar Errors** (type: "error"): Real grammatical mistakes, incorrect verb tenses, subject-verb agreement issues, incorrect or missing punctuation that changes meaning.
2. **Spelling Errors** (type: "error"): Misspelled words or obvious typos.
3. **Style Suggestions** (type: "suggestion"): Only when the original is correct but a clear rewrite would significantly improve clarity. Skip nitpicks.

## Response Format
You MUST respond with valid JSON in this exact format:
{
  "corrections": [
    {
      "original": "the exact problematic text as it appears",
      "suggestions": ["correction option 1", "correction option 2"],
      "type": "error" | "suggestion",
      "explanation": "Clear explanation of why this is an error or suggestion for improvement"
    }
  ],
  "summary": "Brief overall assessment of the text quality"
}

## Important Rules
1. Use the SHORTEST possible snippet in "original" that contains only the erroneous token(s); never return an entire sentence if one word is wrong.
2. Provide 1-3 suggestions for each issue, ordered from most to least recommended.
3. "error" is only for grammar/spelling issues; do not mark pure style or formatting as errors.
4. "suggestion" is optional and only for meaningful clarity/fluency gains.
5. Keep explanations concise but helpful (1-2 sentences).
6. If the text has no issues, return an empty corrections array.
7. Do NOT modify LaTeX commands or markdown syntax unless they are grammatically wrong; ignore minor formatting/spacing that does not change meaning.
8. Focus on the natural language content, not the markup; technical terms and proper nouns are likely correct.
9. Target language for the text being checked is: ${targetLanguage}

## Example Response
{
  "corrections": [
    {
      "original": "He go",
      "suggestions": ["He goes"],
      "type": "error",
      "explanation": "Subject-verb agreement: singular subject needs 'goes'."
    },
    {
      "original": "very good",
      "suggestions": ["excellent"],
      "type": "suggestion",
      "explanation": "Optional: stronger adjective improves clarity."
    }
  ],
  "summary": "The text has 1 grammar error and 1 optional style improvement."
}`;

    return customPrompt ? `${basePrompt}\n\n## Additional Instructions\n${customPrompt}` : basePrompt;
}

/**
 * Generate the user prompt for grammar checking
 */
export function getUserPrompt(text: string, customPrompt: string): string {
    if (customPrompt) {
        return customPrompt.replace('{text}', text);
    }
    
    return `Please analyze the following text for grammar errors, spelling mistakes, and potential style improvements. Return your analysis as JSON.

Text to analyze:
"""
${text}
"""`;
}

/**
 * Get UI message in the specified language
 */
export function getUIMessage(key: string, language: string): string {
    const messages = UI_MESSAGES[language] || UI_MESSAGES['English'];
    return messages[key] || UI_MESSAGES['English'][key] || key;
}
