# Claude Notes

## Important Rules
- **Do NOT modify `test/index.html`** to make a feature work. Features must work via the database (`site_data`) or server config. Get explicit permission from the developers before making any changes to test files.

## Sister Repo
Frontend marketing site (`actuallygoodchatbots`) is hosted on Vercel.

## Supabase Projects

### Production (DSI-Services)
- **Reference ID:** rukppthsduuvsfjynfmw
- **Region:** West US (Oregon) = us-west-2
- **URL:** https://rukppthsduuvsfjynfmw.supabase.co

### Staging (agc-staging)
- **Reference ID:** wbgdpxogtpqijkqyaeke
- **Region:** East US (Ohio) = us-east-2
- **URL:** https://wbgdpxogtpqijkqyaeke.supabase.co

## Database Access

**Preferred:** Use the Supabase Dashboard SQL Editor:
- [Production SQL Editor](https://supabase.com/dashboard/project/rukppthsduuvsfjynfmw/sql)
- [Staging SQL Editor](https://supabase.com/dashboard/project/wbgdpxogtpqijkqyaeke/sql)

**Optional (requires psql):** Direct connection via Session Pooler (IPv4 compatible):
- Production: `postgres://postgres.rukppthsduuvsfjynfmw@aws-0-us-west-2.pooler.supabase.com:5432/postgres`
- Staging: `postgres://postgres.wbgdpxogtpqijkqyaeke@aws-1-us-east-2.pooler.supabase.com:5432/postgres`
- Port 5432 = Session mode, Port 6543 = Transaction mode

**Linux/Mac psql shortcuts** (requires passwords in `~/.bashrc`):
```bash
# Production
bash -c 'export PGPASSWORD=$(grep SUPABASE_DB_PASSWORD ~/.bashrc | cut -d"\"" -f2) && psql "postgres://postgres.rukppthsduuvsfjynfmw@aws-0-us-west-2.pooler.supabase.com:5432/postgres" -c "YOUR SQL"'

# Staging
bash -c 'export PGPASSWORD=$(grep SUPABASE_DB_PASSWORD_STAGING ~/.bashrc | cut -d"\"" -f2) && psql "postgres://postgres.wbgdpxogtpqijkqyaeke@aws-1-us-east-2.pooler.supabase.com:5432/postgres" -c "YOUR SQL"'
```

## Supabase CLI
```bash
npx supabase <command>
```

## Edge Function Deployment
```bash
npx supabase functions deploy chat --no-verify-jwt
```

## Widget Deployment
```bash
# Deploy to staging
npm run widget:deploy

# Deploy to production (auto-swaps URL)
npm run widget:deploy:prod
```

The source file `widget/chat-widget.js` always has the staging URL. Production deploy swaps it automatically.

## Vertex AI Request Format
```typescript
contents: [{ role: 'user', parts: [{ text: message }] }]
```

## GCP Service Account
Credentials stored as Supabase secrets: `GCP_PROJECT_ID`, `GCP_CLIENT_EMAIL`, `GCP_PRIVATE_KEY`

## Adding / Updating Clients

Every client needs three checked-in artifacts (see README for full details):
1. **Prompt file:** `prompts/<clientslug>.txt`
2. **Upsert SQL file:** `insert_<clientslug>.sql` (uses `ON CONFLICT DO UPDATE` — safe to re-run)
3. **Assets:** `assets/clients/<clientslug>/` (bubble images, logos)

**Asset filenames must be globally unique** across all clients (e.g., `agc-bubble-icon.png` not `bubble-icon.png`) because they all upload to the same storage bucket.

**To update a client:** edit the upsert SQL file, then run it against staging and production.

**Production deploy checklist:**
```bash
npm run widget:deploy:prod    # Deploys chat-widget.js + all client assets to storage
npm run functions:deploy:prod # Edge function (if changed)
npm run db:push:prod          # Migrations (if changed)
```
Then upsert client records via the Supabase MCP tool (`execute_sql`). Read each `insert_*.sql` file and execute it against both staging (`wbgdpxogtpqijkqyaeke`) and production (`rukppthsduuvsfjynfmw`).

**Embed code for clients:**
```html
<script src="https://rukppthsduuvsfjynfmw.supabase.co/storage/v1/object/public/widget/chat-widget.js"
  data-client-id="CLIENT_ID"></script>
```

## Widget Data Attributes
| Attribute | Required | Description |
|-----------|----------|-------------|
| `data-client-id` | Yes | Client slug matching `clients.id` |
| `data-bubble-image` | No | Custom bubble image URL |
| `data-brand-color` | No | Hex accent color (default: `#2563eb`) |
| `data-greeting` | No | Custom greeting message |

## Lion Cubs Cookies Client

The `lioncubscookies` client has a chatbot widget that integrates with the headless order builder at `~/devl/lioncubscookies/` (deployed to https://lioncubs-order.vercel.app/).

### Key files
- `prompts/lioncubscookies.txt` — System prompt (all pack sizes, pricing, catering knowledge)
- `insert_lioncubscookies.sql` — Client record with `build_box` tool definition
- `widget/chat-widget.js` — `handleBuildCart()` function handles the `build_box` action

### The build_box tool
The chatbot's `build_box` tool accepts 1-24 cookie names. The widget's `handleBuildCart()` dispatches a `build_box` action that programmatically clicks cookies on the ordering page to fill the box. It uses `clear-and-reclick` approach with staggered delays for larger orders.

### Feature branch
`feat/lioncubs-progressive-ordering` — Updated for variable-size boxes (1-24 cookies), catering knowledge, and dynamic log messages.

### Integration with the ordering app
The ordering app encodes cart data as base64url and sends users to `lioncubscookies.com/?load_cart=ENCODED`. The PHP cart receiver on WordPress decodes the payload and calls `WC()->cart->add_to_cart()`. The chatbot's `build_box` action fills the cart on the ordering page UI, then the user clicks checkout which triggers the same `load_cart` flow.

## Mobile Testing with ngrok

ngrok creates a public URL that tunnels to your local machine, letting you test local code changes on your phone.

### Setup (one-time)
Install ngrok from https://ngrok.com/download, then:
```bash
ngrok config add-authtoken YOUR_TOKEN
```

### Testing workflow
```bash
# Terminal 1: serve files locally from the repo root
python -m http.server 8080

# Terminal 2: expose to internet
ngrok http 8080
```

### Allow the ngrok origin (required for chat API)
The chat edge function checks `allowed_origins`, so the ngrok URL must be added temporarily. Run this in the [Staging SQL Editor](https://supabase.com/dashboard/project/wbgdpxogtpqijkqyaeke/sql):

```sql
-- Add ngrok origin (replace URL with your current ngrok URL)
UPDATE clients
SET allowed_origins = allowed_origins || '["https://YOUR-NGROK-URL.ngrok-free.dev"]'::jsonb
WHERE id = 'CLIENT_ID';
```

Open `https://<ngrok-url>/test/index.html` on your phone. The test page loads the widget from local `../widget/chat-widget.js`, so changes are reflected immediately on refresh.

### Clean up after testing
Remove the ngrok origin when done:

```sql
-- Remove ngrok origin
UPDATE clients
SET allowed_origins = allowed_origins - 'https://YOUR-NGROK-URL.ngrok-free.dev'
WHERE id = 'CLIENT_ID';

-- Verify
SELECT allowed_origins FROM clients WHERE id = 'CLIENT_ID';
```
