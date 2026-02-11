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

### 1. Gather business info
Scrape or collect: services, staff, hours, contact info, website pages.

### 2. Insert into database
Go to the Supabase SQL Editor ([production](https://supabase.com/dashboard/project/rukppthsduuvsfjynfmw/sql) or [staging](https://supabase.com/dashboard/project/wbgdpxogtpqijkqyaeke/sql)) and run:

```sql
INSERT INTO clients (id, name, phone, email, site_data, plan_type) VALUES (
  'clientslug',
  'Business Name',
  '(555) 123-4567',
  'contact@business.com',
  '{
    "business": {
      "name": "Business Name",
      "description": "What they do...",
      "phone": "(555) 123-4567",
      "email": "contact@business.com",
      "hours": "Mon-Fri 9-5",
      "serviceArea": "City, State"
    },
    "pages": {
      "home": "https://their-site.com/",
      "services": "https://their-site.com/services/"
    },
    "services": [
      {"name": "Service 1", "description": "Details..."},
      {"name": "Service 2", "description": "Details..."}
    ],
    "staff": [
      {"name": "Jane Doe", "credentials": "Title", "role": "Owner"}
    ]
  }'::jsonb,
  'basic'
);
```

### 3. Give client their embed code
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

## Viewing Chat Logs

Query the `chat_logs` table to see conversations:

```sql
SELECT * FROM chat_logs
WHERE client_id = 'clientslug'
ORDER BY created_at DESC;
```

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
