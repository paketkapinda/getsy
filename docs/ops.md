# Operations & Deployment Guide

## Setup Steps

### 1. Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Create new project
3. Note your project URL and anon/service role keys

### 2. Run Migrations

#### Existing Migrations (001-011)
Run migrations from ETSY PLATFORM.MD in order:
```bash
supabase db push
# Or via SQL editor in Supabase dashboard
```

#### New Migrations (012-020)
Run new migrations in sequence:
```bash
# Via Supabase CLI
supabase migration up

# Or via SQL editor
# Execute each file: 012_rev_products.sql, 013_producers.sql, ..., 020_rls_updates.sql
```

### 3. Create Storage Buckets

In Supabase Dashboard → Storage:
- Create bucket: `mockups` (public)
- Create bucket: `invoices` (private, with RLS)

### 4. Deploy Edge Functions

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link project
supabase link --project-ref <your-project-ref>

# Deploy all functions
supabase functions deploy etsy-auth
supabase functions deploy etsy-sync
supabase functions deploy etsy-listing-create
supabase functions deploy etsy-image-upload
supabase functions deploy pod-cost
supabase functions deploy pod-send-order
supabase functions deploy pod-webhook
supabase functions deploy ai-mockup
supabase functions deploy ai-seo
supabase functions deploy ai-top-seller
supabase functions deploy ai-messageReply
supabase functions deploy payments-distribute
supabase functions deploy payments-invoice
supabase functions deploy jobs-runner
supabase functions deploy admin-reports
supabase functions deploy etsy-webhook
```

### 5. Set Environment Variables

In Supabase Dashboard → Edge Functions → Settings:

**Required**:
```
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
```

**Etsy** (optional, for real mode):
```
ETSY_CLIENT_ID=<etsy-client-id>
ETSY_CLIENT_SECRET=<etsy-client-secret>
ETSY_REDIRECT_URI=https://your-domain.com/callback
ETSY_WEBHOOK_SECRET=<webhook-secret>
```

**OpenAI** (optional, for real mode):
```
OPENAI_API_KEY=<openai-api-key>
```

**POD Providers** (optional):
```
POD_WEBHOOK_SECRET=<pod-webhook-secret>
```

**Payment Gateways** (optional):
```
USE_WISE=true
USE_PAYONEER=false
WISE_API_KEY=<wise-key>
PAYONEER_API_KEY=<payoneer-key>
```

**Mock Mode** (for development):
```
MOCK_PROVIDER=true
```

### 6. Schedule Jobs

#### Option A: Supabase Scheduled Functions
In Supabase Dashboard → Database → Cron Jobs:
- Create cron job: `0 2 * * *` → calls `jobs-runner` (daily at 2 AM)
- Create cron job: `0 */6 * * *` → calls `etsy-sync` (every 6 hours)

#### Option B: External Cron
Use external service (e.g., cron-job.org) to call:
```
POST https://<project>.supabase.co/functions/v1/jobs-runner
Headers: Authorization: Bearer <service-role-key>
```

### 7. Deploy Frontend

#### Option A: Static Hosting (Vercel/Netlify)
1. Connect repo to Vercel/Netlify
2. Set build command: `echo "No build needed"`
3. Set publish directory: `/public` and `/frontend`
4. Add environment variable: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`

#### Option B: Supabase Hosting
```bash
supabase hosting deploy
```

#### Option C: Manual
Upload `/public` and `/frontend` to any static host.

Update `frontend/assets/js/supabaseClient.js` with your Supabase URL and anon key.

## Token Rotation

### Etsy Tokens
- Tokens expire after 1 hour (Etsy OAuth)
- Edge function `etsy-auth` handles refresh automatically
- Manual refresh: call `etsy-auth` with refresh token

### HMAC Secrets
- Rotate `ETSY_WEBHOOK_SECRET` and `POD_WEBHOOK_SECRET` periodically
- Update in Edge Function env vars
- Update webhook URLs in Etsy/POD provider dashboards

## Monitoring

### Supabase Dashboard
- Monitor Edge Function invocations and errors
- Check database query performance
- Review RLS policy violations

### Logs
- Edge Function logs: Supabase Dashboard → Edge Functions → Logs
- AI operation logs: `ai_logs` table
- Job queue status: `job_queue` table

## Troubleshooting

### RLS Policy Violations
- Check user_id matches auth.uid()
- Verify team membership for team-based access
- Review RLS policies in `010_rls_policies.sql` and `020_rls_updates.sql`

### Edge Function Errors
- Check environment variables are set
- Verify JWT token is valid
- Review function logs in Supabase Dashboard

### Storage Upload Failures
- Verify bucket exists and is public (for mockups)
- Check RLS policies on storage buckets
- Ensure file size limits are not exceeded

### OpenAI Rate Limits
- Monitor `ai_logs` table for token usage
- Implement rate limiting in Edge Functions
- Use `MOCK_PROVIDER=true` for development

## Cost Optimization

### OpenAI
- Cache AI responses when possible
- Use GPT-3.5-turbo for simple tasks, GPT-4 for complex
- Monitor `ai_logs.tokens_used` and `cost_estimate`

### Supabase
- Optimize RLS policies (avoid full table scans)
- Use indexes on frequently queried columns
- Monitor Edge Function execution time

### Storage
- Compress images before upload
- Use CDN for public assets
- Clean up old mockups/invoices periodically

## Backup & Recovery

### Database
- Supabase provides automatic daily backups
- Manual backup: `supabase db dump > backup.sql`
- Restore: `supabase db reset` then import SQL

### Storage
- Export bucket contents periodically
- Use Supabase Storage versioning

## Security Checklist

- [ ] All API keys stored in Edge Function env (never in frontend)
- [ ] RLS policies enabled on all tables
- [ ] Webhook HMAC verification implemented
- [ ] JWT tokens validated in all Edge Functions
- [ ] Storage buckets have appropriate RLS
- [ ] CORS headers configured correctly
- [ ] Rate limiting implemented (if needed)

## Migration from Existing System

1. Run new migrations (012-020) on existing database
2. No data migration required (additive only)
3. Deploy new Edge Functions
4. Update frontend to use new endpoints
5. Test with `MOCK_PROVIDER=true` first
6. Switch to real providers gradually

## Recommended Limits

- **OpenAI**: 100 requests/minute (adjust based on plan)
- **Etsy API**: 10 requests/second (Etsy limit)
- **Edge Functions**: 60s timeout (Supabase limit)
- **Storage**: 50MB per file (Supabase limit)

