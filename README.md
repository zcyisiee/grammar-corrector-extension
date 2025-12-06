# AI Grammar Corrector

一款基于大语言模型 (LLM) 的 VSCode 语法纠正插件，支持 Markdown 和 LaTeX 文件。

A VSCode extension for grammar and spelling correction powered by Large Language Models (LLM), supporting Markdown and LaTeX files.

![Demo](https://via.placeholder.com/800x400?text=AI+Grammar+Corrector+Demo)

## ✨ Features | 功能特点

### 🔴 Error Detection | 错误检测
- Grammar errors (语法错误)
- Spelling mistakes (拼写错误)
- Punctuation issues (标点问题)

### 🟡 Style Suggestions | 风格建议
- Better word choices (更好的用词)
- More natural expressions (更自然的表达)
- Improved sentence structure (改进的句子结构)

### 🟢 Smart Corrections | 智能纠正
- Multiple correction options (多个纠正选项)
- Accept/Reject functionality (接受/拒绝功能)
- Detailed explanations (详细说明)

### 🌍 Multi-language Support | 多语言支持
- English, Chinese, Spanish, French, German
- Japanese, Korean, Portuguese, Russian, Italian
- UI language configurable (可配置界面语言)

## 📦 Installation | 安装

### From VSIX file | 从 VSIX 文件安装

1. Download the `.vsix` file
2. Open VS Code
3. Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac)
4. Type "Install from VSIX" and select it
5. Choose the downloaded `.vsix` file

### From Source | 从源码安装

```bash
# Clone the repository
git clone https://github.com/yourusername/ai-grammar-corrector.git
cd ai-grammar-corrector

# Install dependencies
npm install

# Compile
npm run compile

# Package
npm run package
```

## ⚙️ Configuration | 配置

Open VS Code Settings (`Ctrl+,`) and search for "AI Grammar Corrector".

### Required Settings | 必需设置

| Setting | Description | 说明 |
|---------|-------------|------|
| `apiUrl` | LLM API endpoint | API 端点 URL |
| `apiKey` | Your API key | 您的 API 密钥 |

### Optional Settings | 可选设置

| Setting | Default | Description | 说明 |
|---------|---------|-------------|------|
| `model` | `gpt-4o-mini` | LLM model to use | 使用的模型 |
| `targetLanguage` | `English` | Target language for checking | 检查的目标语言 |
| `uiLanguage` | `English` | UI language | 界面语言 |
| `maxTokens` | `2000` | Max tokens for response | 响应最大 token 数 |
| `temperature` | `0.3` | LLM temperature | LLM 温度参数 |
| `showExplanations` | `true` | Show explanations | 显示说明 |
| `enableSuggestions` | `true` | Enable style suggestions | 启用风格建议 |
| `customSystemPrompt` | `""` | Additional system prompt | 附加系统提示词 |
| `customUserPrompt` | `""` | Custom user prompt | 自定义用户提示词 |

### Example Settings | 示例配置

```json
{
    "aiGrammarCorrector.apiUrl": "https://api.openai.com/v1/chat/completions",
    "aiGrammarCorrector.apiKey": "sk-your-api-key-here",
    "aiGrammarCorrector.model": "gpt-4o-mini",
    "aiGrammarCorrector.targetLanguage": "English",
    "aiGrammarCorrector.uiLanguage": "Chinese",
    "aiGrammarCorrector.showExplanations": true,
    "aiGrammarCorrector.enableSuggestions": true
}
```

### Compatible APIs | 兼容的 API

This extension works with any OpenAI-compatible API:

| Provider | API URL |
|----------|---------|
| OpenAI | `https://api.openai.com/v1/chat/completions` |
| Azure OpenAI | `https://{resource}.openai.azure.com/openai/deployments/{deployment}/chat/completions?api-version=2024-02-01` |
| Anthropic (via proxy) | Requires OpenAI-compatible proxy |
| Local LLMs (Ollama) | `http://localhost:11434/v1/chat/completions` |
| OpenRouter | `https://openrouter.ai/api/v1/chat/completions` |

## 🚀 Usage | 使用方法

### Method 1: Selection + Keyboard Shortcut | 方法一：选择 + 快捷键

1. Select text in a `.md` or `.tex` file
2. Press `Ctrl+Shift+G` (or `Cmd+Shift+G` on Mac)
3. Wait for analysis
4. Hover over highlighted areas to see suggestions
5. Click the lightbulb (💡) or press `Ctrl+.` to see quick fixes
6. Choose "Accept" or "Reject"

### Method 2: Context Menu | 方法二：右键菜单

1. Select text in a `.md` or `.tex` file
2. Right-click to open context menu
3. Select "AI Grammar: Check Selected Text"

### Method 3: Command Palette | 方法三：命令面板

1. Press `Ctrl+Shift+P` (or `Cmd+Shift+P`)
2. Type "AI Grammar"
3. Choose from available commands:
   - `AI Grammar: Check Selected Text`
   - `AI Grammar: Check Entire Document`
   - `AI Grammar: Clear All Diagnostics`

## 🎨 Visual Indicators | 视觉指示

| Color | Meaning | 含义 |
|-------|---------|------|
| 🔴 Red background | Grammar/spelling error | 语法/拼写错误 |
| 🟡 Yellow background | Style suggestion | 风格建议 |
| 🟢 Green in hover | Recommended corrections | 推荐纠正 |

## 📝 Custom Prompts | 自定义提示词

### Custom System Prompt | 自定义系统提示词

Add additional instructions to the system prompt:

```json
{
    "aiGrammarCorrector.customSystemPrompt": "Focus on academic writing style. Be strict about passive voice usage."
}
```

### Custom User Prompt | 自定义用户提示词

Replace the default user prompt (use `{text}` as placeholder):

```json
{
    "aiGrammarCorrector.customUserPrompt": "Please check this academic paper excerpt for grammar errors and suggest improvements:\n\n{text}"
}
```

## 🔧 Troubleshooting | 故障排除

### API Key Not Working | API 密钥无效

1. Check if the API key is correctly set in settings
2. Verify the API URL is correct for your provider
3. Check your API quota/credits

### No Diagnostics Appearing | 没有显示诊断

1. Ensure the file is saved with `.md` or `.tex` extension
2. Make sure you have selected text before running the command
3. Check the Output panel for errors

### Slow Response | 响应缓慢

1. Try using a faster model (e.g., `gpt-4o-mini`)
2. Reduce the selected text length
3. Check your network connection

## 🤝 Contributing | 贡献

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License | 许可证

MIT License - see LICENSE file for details.

## 🙏 Acknowledgments | 致谢

- OpenAI for GPT models
- VS Code Extension API
- All contributors and users

---

**Made with ❤️ for better writing**
