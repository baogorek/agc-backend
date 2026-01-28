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
    migrations/     # Database schema
    functions/chat/ # Edge Function
    seed.sql        # Test data
  widget/
    chat-widget.js  # Embeddable widget
  test/
    index.html      # Local test page
```

## Local Development

```bash
npm install
npm run start              # Start local Supabase (requires Docker)
npm run db:reset           # Apply migrations + seed
npm run functions:serve    # Serve Edge Function locally
```

## Deployment

```bash
npm run db:push            # Push migrations to production
npm run functions:deploy   # Deploy Edge Function
```

## Adding a New Client

### 1. Gather business info
Scrape or collect: services, staff, hours, contact info, website pages.

### 2. Insert into database
Go to [Supabase SQL Editor](https://supabase.com/dashboard/project/rukppthsduuvsfjynfmw/sql) and run:

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

## Staging Environment

Staging Supabase project: `agc-staging` (ref: `wbgdpxogtpqijkqyaeke`, East US Ohio)

### Developing a widget feature in staging

1. **Edit `widget/chat-widget-staging.js`** — this file points at the staging Supabase URL. Production's `widget/chat-widget.js` is never touched.

2. **Test locally** — serve the repo root and open the test page:
   ```bash
   python3 -m http.server 8080
   # open http://localhost:8080/test/staging-test.html
   ```
   The test page loads the staging widget from localhost and talks to the staging edge function. Edit `test/staging-test.html` to configure `data-` attributes.

3. **Upload staging widget to staging storage** (only needed if testing via the hosted URL rather than localhost):
   ```bash
   curl -X PUT "https://wbgdpxogtpqijkqyaeke.supabase.co/storage/v1/object/widget/chat-widget.js" \
     -H "Authorization: Bearer STAGING_SERVICE_ROLE_KEY" \
     -H "Content-Type: application/javascript" \
     --data-binary @widget/chat-widget-staging.js
   ```

4. **Upload assets** (images, etc.) to staging storage:
   ```bash
   curl -X POST "https://wbgdpxogtpqijkqyaeke.supabase.co/storage/v1/object/widget/FILENAME" \
     -H "Authorization: Bearer STAGING_SERVICE_ROLE_KEY" \
     -H "Content-Type: image/jpeg" \
     --data-binary @path/to/file
   ```

5. **Deploy edge function changes to staging:**
   ```bash
   npx supabase link --project-ref wbgdpxogtpqijkqyaeke
   npx supabase functions deploy chat --no-verify-jwt
   ```

6. **Staging allowed origins** include `localhost:3000`, `localhost:5173`, and `localhost:8080` for local testing.

### Promoting staging to production

Once validated in staging:

1. **Port widget changes** — copy the staging widget and swap the Supabase URL:
   ```bash
   cp widget/chat-widget-staging.js widget/chat-widget.js
   sed -i 's|wbgdpxogtpqijkqyaeke|rukppthsduuvsfjynfmw|' widget/chat-widget.js
   ```

2. **Upload production widget:**
   ```bash
   curl -X PUT "https://rukppthsduuvsfjynfmw.supabase.co/storage/v1/object/widget/chat-widget.js" \
     -H "Authorization: Bearer PROD_SERVICE_ROLE_KEY" \
     -H "Content-Type: application/javascript" \
     --data-binary @widget/chat-widget.js
   ```

3. **Upload any new assets** to production storage (same curl pattern, production URL).

4. **Deploy edge function changes to production:**
   ```bash
   npx supabase link --project-ref rukppthsduuvsfjynfmw
   npx supabase functions deploy chat --no-verify-jwt
   ```

5. **Push database migrations** (if any):
   ```bash
   npx supabase db push
   ```

6. **Re-link CLI back to staging** when done:
   ```bash
   npx supabase link --project-ref wbgdpxogtpqijkqyaeke
   ```
