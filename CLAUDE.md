# Claude Notes

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
