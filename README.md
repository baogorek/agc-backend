# AGC Backend

Supabase backend for the Actually Good Chatbots widget service. Clients embed a script tag on their websites, which calls our Edge Function to handle AI chat interactions.

## Architecture

```
Client's Website
    ↓
<script src=".../widget/chat-widget.js" data-client-id="clientslug">
    ↓
Supabase Edge Function POST /chat
    ├── Validate clientId
    ├── Fetch client config from DB
    ├── Build system prompt from site_data
    ├── Call Gemini API (key hidden server-side)
    ├── Log conversation to chat_logs
    └── Return response
```

## Project Structure

```
agc-backend/
  supabase/
    migrations/                # Database schema
    functions/chat/            # Edge Function
    seed.sql                   # Test data
  widget/
    chat-widget.js             # Widget source (staging URL, swapped to prod on deploy)
  scripts/
    chat-transcripts.py        # Generate customer chat transcripts from CSV exports
  assets/
    clients/<clientslug>/      # Bubble images and other per-client assets
  test/
    index.html                 # Local test page
    staging-test.html          # Multi-page test (home, services, new client)
```

## Local Development

```bash
npm install
npm run start              # Start local Supabase (requires Docker)
npm run db:reset           # Apply migrations + seed
npm run functions:serve    # Serve Edge Function locally
```

## Deployment

> **Safety note:** The Supabase CLI should always stay linked to **staging**. The bare `npm run` commands deploy to staging. Production deploys use dedicated npm scripts that pass `--project-ref` explicitly.

## Adding a New Client

Every client needs **three checked-in artifacts** before going live:

| Artifact | Location | Purpose |
|----------|----------|---------|
| Prompt file | `prompts/<clientslug>.txt` | System prompt source of truth |
| Insert SQL | `insert_<clientslug>.sql` | Reproducible client record |
| Assets | `assets/clients/<clientslug>/` | Bubble images, logos |

### 1. Gather business info
Scrape or collect: services, staff, hours, contact info, website pages.

### 2. Write the prompt file
Create `prompts/<clientslug>.txt` with the system prompt. This is the source of truth — the insert SQL file embeds it into `site_data.systemPrompt`.

### 3. Create the upsert SQL file
Create `insert_<clientslug>.sql` with an `INSERT ... ON CONFLICT (id) DO UPDATE` statement. See existing files for examples. This file should include:
- All `site_data` fields (business info, systemPrompt, widgetConfig, tools, etc.)
- `allowed_origins` array (include www/non-www, localhost for dev, any custom domains)
- Production storage URLs for assets like `bubbleImage`

The upsert pattern makes the file idempotent — safe to re-run anytime, whether the client is new or already exists. To update a client, edit the file and re-run it.

> **Important:** The upsert SQL file is the source of truth for the client record. Never modify client data via the SQL Editor without updating the corresponding file first. This prevents "hanging data" that exists in a database but can't be reproduced.

### 4. Upload assets to storage
Upload any bubble images or logos to the Supabase storage `widget` bucket in both staging and production.

### 5. Insert into staging, test, then production
Use the Supabase MCP `execute_sql` tool to run the insert SQL against staging (`wbgdpxogtpqijkqyaeke`) first. Test the widget. Then run against production (`rukppthsduuvsfjynfmw`). Alternatively, use the [staging](https://supabase.com/dashboard/project/wbgdpxogtpqijkqyaeke/sql) / [production](https://supabase.com/dashboard/project/rukppthsduuvsfjynfmw/sql) SQL Editor.

> **Note:** If `bubbleImage` URLs differ between staging and production storage, update the URL before running against each environment.

### 6. Give client their embed code
```html
<script
  src="https://rukppthsduuvsfjynfmw.supabase.co/storage/v1/object/public/widget/chat-widget.js"
  data-client-id="clientslug">
</script>
```

They paste this before `</body>` on their site.

## Widget Customization

Per-client customization via data attributes on the embed script tag:

| Attribute | Required | Description |
|-----------|----------|-------------|
| `data-client-id` | Yes | Client slug matching `clients.id` in the database |
| `data-bubble-image` | No | URL to a custom bubble image (replaces default chat icon) |
| `data-brand-color` | No | Hex color for accents — user messages, send button, links (default: `#2563eb`) |
| `data-greeting` | No | Custom greeting shown on first open and in the speech bubble (default: time-based greeting) |

Example embed code with all options:
```html
<script src="https://rukppthsduuvsfjynfmw.supabase.co/storage/v1/object/public/widget/chat-widget.js"
  data-client-id="localmobilevet"
  data-bubble-image="https://rukppthsduuvsfjynfmw.supabase.co/storage/v1/object/public/widget/savannah-the-dog.jpg"
  data-brand-color="#009345"
  data-greeting="Hi, I'm Savannah, your canine assistant! What questions do you have for our mobile vet team?">
</script>
```

## Widget Tool Actions

Some clients have tools that trigger UI actions on their page. The widget's `handleAction()` dispatches these based on the tool name and arguments returned by the LLM.

**Example: `lioncubscookies` client** — The `build_box` tool takes an array of 1-24 cookie names. The widget's `handleBuildCart()` function programmatically clicks cookies on the ordering page to fill the user's box. The ordering app (`~/devl/lioncubscookies/`) then encodes the cart as base64url and sends the user to WordPress checkout via `?load_cart=ENCODED`.

Tool actions are defined in each client's `site_data.tools` array in `insert_<clientslug>.sql`.

## Viewing Chat Logs

Query the `chat_logs` table to see conversations:

```sql
SELECT * FROM chat_logs
WHERE client_id = 'clientslug'
ORDER BY created_at DESC;
```

### Chat Transcripts

Export chat logs to CSV from Supabase, then use `scripts/chat-transcripts.py` to generate readable transcripts. The script automatically filters out developer testing sessions (messages from "Ben", "Hugh", or containing "testing"/"test").

**Step 1:** Go to the [Production SQL Editor](https://supabase.com/dashboard/project/rukppthsduuvsfjynfmw/sql) and run:
```sql
SELECT * FROM chat_logs WHERE client_id = 'localmobilevet' ORDER BY created_at DESC;
```
Then click **Export to CSV** and save the file.

**Step 2:** Run the script:

```bash
# Full transcripts of real customer chats
python scripts/chat-transcripts.py export.csv

# Summary table only
python scripts/chat-transcripts.py export.csv --summary

# Filter to a specific month
python scripts/chat-transcripts.py export.csv --month 2026-02

# Filter to a specific client
python scripts/chat-transcripts.py export.csv --client-id localmobilevet

# Write to a file
python scripts/chat-transcripts.py export.csv --month 2026-02 -o feb-transcripts.txt

# Include test sessions (for debugging the bot itself)
python scripts/chat-transcripts.py export.csv --include-test
```

Requires `pandas` (`pip install pandas`).

## Environment Variables

Edge Function uses these (set via `npx supabase secrets set`):
- `GCP_PROJECT_ID` - GCP project identifier
- `GCP_CLIENT_EMAIL` - Service account email
- `GCP_PRIVATE_KEY` - Service account private key
- `SUPABASE_URL` - Auto-provided
- `SUPABASE_SERVICE_ROLE_KEY` - Auto-provided

## Staging Environment

Staging Supabase project: `agc-staging` (ref: `wbgdpxogtpqijkqyaeke`, East US Ohio)

### Widget Development Workflow

The source file `widget/chat-widget.js` always contains the **staging** Supabase URL. This is a safety measure — if you forget to do anything special, you're testing against staging (not production).

1. **Edit `widget/chat-widget.js`** — this is the only widget file

2. **Test locally:**
   ```bash
   python3 -m http.server 8080
   # open http://localhost:8080/test/index.html
   ```
   The test pages load the local widget file. Since `localhost:8080` is in staging's `allowed_origins`, chat responses work.

3. **Test on mobile (visual only):**
   ```bash
   ngrok http 8080
   # open https://<ngrok-url>/test/staging-mobile-test.html on phone
   ```
   Chat responses won't work (ngrok origin not allowed), but you can test UI/UX.

4. **Deploy to staging storage** (optional, for testing hosted widget):
   ```bash
   npm run widget:deploy
   ```

### Deploy to Staging

```bash
npm run widget:deploy      # Widget to staging storage
npm run functions:deploy   # Edge Function to staging
npm run db:push            # Migrations to staging
```

### Staging allowed origins

These origins can make chat requests to staging:
- `http://localhost:3000`
- `http://localhost:5173`
- `http://localhost:8080`

### Promoting to Production

> **Safety note:** The Supabase CLI should always stay linked to **staging**. Production deploys use dedicated npm scripts that pass `--project-ref` explicitly, so you never need to re-link.

1. **Test locally** at `http://localhost:8080/test/index.html`

2. **Deploy widget to production:**
   ```bash
   npm run widget:deploy:prod
   ```

3. **Deploy edge function changes** (if any):
   ```bash
   npm run functions:deploy:prod
   ```

4. **Push database migrations** (if any):
   ```bash
   npm run db:push:prod
   ```

5. **Upsert client records** (if any client data changed):
   Use the Supabase MCP `execute_sql` tool to run each `insert_*.sql` file against production (`rukppthsduuvsfjynfmw`).
