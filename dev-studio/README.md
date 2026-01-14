# AGC Dev Studio

Local testing tool for chatbots. Bypasses origin restrictions by calling Vertex AI directly.

## Setup

1. Copy credentials to `.env`:
```bash
cp .env.example .env
```

2. Fill in `.env` with:
- `SUPABASE_SERVICE_ROLE_KEY` - From Supabase Dashboard > Settings > API
- `GCP_PROJECT_ID`, `GCP_CLIENT_EMAIL`, `GCP_PRIVATE_KEY` - From your GCP service account JSON

3. Install dependencies:
```bash
npm install
```

## Run

```bash
npm run dev
```

This starts both:
- Express API server on http://localhost:3001
- Vite frontend on http://localhost:5173

Open http://localhost:5173 in your browser.

## Features

- **Client selector** - Switch between clients from database
- **Model selector** - Toggle between Gemini 3 Flash and 2.0 Flash
- **Prompt viewer** - See system prompt and full API request
- **Chat interface** - Multi-turn conversations
- **Debug panel** - Latency, token counts, raw response
