# Claude Notes

## Sister Repo
Frontend website is in `~/devl/actuallygoodchatbots` - the marketing site hosted on Vercel.

## Supabase Projects

### Production (DSI-Services)
- **Reference ID:** rukppthsduuvsfjynfmw
- **Region:** West US (Oregon) = us-west-2
- **URL:** https://rukppthsduuvsfjynfmw.supabase.co

### Staging (agc-staging)
- **Reference ID:** wbgdpxogtpqijkqyaeke
- **Region:** East US (Ohio) = us-east-2
- **URL:** https://wbgdpxogtpqijkqyaeke.supabase.co

## Database Connection
Direct connection is IPv6 only. Use **Session Pooler** (free, IPv4 compatible):

Production:
```bash
bash -c 'export PGPASSWORD=$(grep SUPABASE_DB_PASSWORD ~/.bashrc | cut -d"\"" -f2) && psql "postgres://postgres.rukppthsduuvsfjynfmw@aws-0-us-west-2.pooler.supabase.com:5432/postgres" -c "YOUR SQL"'
```

Staging:
```bash
bash -c 'export PGPASSWORD=$(grep SUPABASE_DB_PASSWORD_STAGING ~/.bashrc | cut -d"\"" -f2) && psql "postgres://postgres.wbgdpxogtpqijkqyaeke@aws-1-us-east-2.pooler.supabase.com:5432/postgres" -c "YOUR SQL"'
```

- Passwords stored in `~/.bashrc` as `SUPABASE_DB_PASSWORD` (prod) and `SUPABASE_DB_PASSWORD_STAGING` (staging)
- Port 5432 = Session mode, Port 6543 = Transaction mode

## Supabase CLI
```bash
npx supabase <command>
```

## Edge Function Deployment
```bash
npx supabase functions deploy chat --no-verify-jwt
```

## Vertex AI Request Format
```typescript
contents: [{ role: 'user', parts: [{ text: message }] }]
```

## GCP Service Account
Credentials stored as Supabase secrets: `GCP_PROJECT_ID`, `GCP_CLIENT_EMAIL`, `GCP_PRIVATE_KEY`

## Adding New Clients
1. Create site_data JSON (see `insert_agc_client.sql` for example)
2. INSERT into `clients` table with `allowed_origins` array (include both www and non-www)
3. Give client the embed code:
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
