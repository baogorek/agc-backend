# Claude Notes

## Sister Repo
Frontend website is in `~/devl/actuallygoodchatbots` - the marketing site hosted on Vercel.

## Supabase Project
- **Project:** DSI-Services
- **Reference ID:** rukppthsduuvsfjynfmw
- **Region:** West US (Oregon) = us-west-2

## Database Connection
Direct connection is IPv6 only. Use **Session Pooler** (free, IPv4 compatible):
```bash
bash -c 'export PGPASSWORD=$(grep SUPABASE_DB_PASSWORD ~/.bashrc | cut -d"\"" -f2) && psql "postgres://postgres.rukppthsduuvsfjynfmw@aws-0-us-west-2.pooler.supabase.com:5432/postgres" -c "YOUR SQL"'
```
- Password stored in `~/.bashrc` as `SUPABASE_DB_PASSWORD`
- Port 5432 = Session mode (good for scripts)
- Port 6543 = Transaction mode (for app connections)

To run a SQL file:
```bash
bash -c 'export PGPASSWORD=$(grep SUPABASE_DB_PASSWORD ~/.bashrc | cut -d"\"" -f2) && psql "postgres://postgres.rukppthsduuvsfjynfmw@aws-0-us-west-2.pooler.supabase.com:5432/postgres" -f path/to/file.sql'
```

## Supabase CLI
```bash
npx supabase <command>
```

## Edge Function Deployment
Public functions (no auth required):
```bash
npx supabase functions deploy chat --no-verify-jwt
```

## Vertex AI Request Format
Contents must include `role: 'user'`:
```typescript
contents: [{ role: 'user', parts: [{ text: message }] }]
```

## GCP Service Account
Credentials stored as Supabase secrets:
- `GCP_PROJECT_ID`
- `GCP_CLIENT_EMAIL`
- `GCP_PRIVATE_KEY`

## Adding New Clients
1. Create site_data JSON (see `insert_agc_client.sql` for example)
2. INSERT into `clients` table with `allowed_origins` array (include both www and non-www)
3. Give client the embed code:
```html
<script src="https://rukppthsduuvsfjynfmw.supabase.co/storage/v1/object/public/widget/chat-widget.js"
  data-client-id="CLIENT_ID"></script>
```
