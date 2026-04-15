# Action Bento 🍱

**Turn any video or article into a structured learning checklist with AI.**

Action Bento breaks down videos (YouTube, Bilibili, etc.) and web articles into 5–8 actionable learning milestones. Check them off as you go, and watch your progress grow.

## Features

- **AI-Powered Breakdown** — Paste any video or article URL, and the AI generates specific, actionable milestones
- **Category Tagging** — Milestones are color-coded: purple (Core Concept), green (Case Study), gold (Monetization)
- **Progress Tracking** — Real-time progress bar per group and overall
- **History Archive** — Completed groups move to "Nutrition Absorbed" with stats
- **Confetti Celebration** — Finish a group and get a confetti burst 🎉
- **Undo from History** — Click any archived group to bring it back
- **Multilingual** — Simplified Chinese, Traditional Chinese, English
- **Supports Multiple Sources** — YouTube, Bilibili, blog posts, news articles, documentation, any webpage

## Quick Start

```bash
# 1. Clone the repo
git clone https://github.com/YOUR_USERNAME/-Action-Bento.git
cd -Action-Bento

# 2. Copy the example config and add your API key
cp config.example.json config.json
# Edit config.json with your actual API key

# 3. Start the server
python3 server.py

# 4. Open in browser
open http://localhost:8080
```

## Configuration

Edit `config.json` (or use the in-app Settings panel):

| Field | Description |
|-------|-------------|
| `provider` | `"openai"` or `"custom"` |
| `apiKey` | Your API key |
| `endpoint` | API endpoint (for custom providers like DeepSeek) |
| `model` | Model name (e.g. `deepseek-chat`, `gpt-4o-mini`) |

### Supported LLM Providers

- **OpenAI** — `gpt-4o-mini`, `gpt-4o`, etc.
- **DeepSeek** — `deepseek-chat` (via custom endpoint `https://api.deepseek.com/v1`)
- **Any OpenAI-compatible API** — Set your endpoint and model

## Tech Stack

- **Frontend**: Vanilla HTML/CSS/JS — no build step needed
- **Backend**: Python 3 (`http.server`) — zero dependencies
- **AI**: Any OpenAI-compatible LLM API

## Screenshots

Paste a link → AI breaks it down → Check off milestones → Archive to history

## License

MIT
