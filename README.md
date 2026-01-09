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
- `GEMINI_API_KEY` - Google Gemini API key
- `SUPABASE_URL` - Auto-provided
- `SUPABASE_SERVICE_ROLE_KEY` - Auto-provided
